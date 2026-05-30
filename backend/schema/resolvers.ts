import { GraphQLError } from "graphql";
import type { GraphQLContext } from "../graphqlContext.js";
import type { TranslateFn } from "../i18n/t.js";
import { existsSync, unlinkSync } from "fs";
import path from "path";
import { imagesDir } from "../utils/upload.js";
import {
  createUser,
  deleteUserById,
  findAllUsers,
  findUserByEmail,
  findUserById,
  searchUsers,
  toUser,
  updateUser,
  verifyPassword,
} from "../models/user.js";
import {
  assertStockAvailableForLines,
  createProduct as createProductModel,
  deleteProductById,
  findAllProducts,
  findProductById,
  searchProducts,
  updateProductById,
} from "../models/product.js";
import {
  createOrder,
  deleteOrderById,
  findAllOrders,
  findOrderById,
  findOrdersByUserId,
  markOrderDeliveredById,
  searchOrders,
  setOrderPaidByStripePaymentIntentId,
  type OrderItem,
  type OrderShippingAddress,
} from "../models/order.js";
import {
  createReviewByUser,
  deleteReviewById,
  findAllReviews,
  findReviewsByProductId,
  findReviewsByUserId,
  searchReviews,
} from "../models/review.js";
import { findChatMessagesByOrderId } from "../models/chat.js";
import { signToken } from "../auth/jwt.js";
import { sendContactEmail } from "../mailer.js";
import getCoordsForAddress from "../utils/location.js";
import {
  assertClientOrderTotalsMatch,
  computeOrderTotalsFromItems,
} from "../utils/shipping.js";
import { resolveOrderItemsFromDatabase } from "../utils/resolveOrderItems.js";
import {
  withOrderItemImages,
  withOrderItemImagesList,
} from "../utils/orderPresent.js";
import {
  capturePayPalOrder,
  createPayPalCheckoutOrder,
} from "../utils/paypal.js";
import StripeSDK from "stripe";

const ADDRESS = process.env.STORE_ADDRESS ?? "";
const CURRENCY = (process.env.CURRENCY ?? "PLN").toLowerCase();

let stripeClient: StripeSDK | null = null;
async function getStripe(t: TranslateFn): Promise<StripeSDK> {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new GraphQLError(t("stripeNotConfigured"));
  }
  stripeClient = new StripeSDK(key);
  return stripeClient;
}

function toMinorUnits(amountMajor: number): number {
  // PLN uses 2 decimal places.
  return Math.round(amountMajor * 100);
}

function toPayPalMajorUnitString(amountMajor: number): string {
  return amountMajor.toFixed(2);
}

function parseClientOrderTotalsFields(
  input: {
    itemsQuantity?: unknown;
    itemsPrice?: unknown;
    shippingPrice?: unknown;
    totalPrice?: unknown;
  },
  t: TranslateFn
): {
  itemsQuantity: number;
  itemsPrice: number;
  shippingPrice: number;
  totalPrice: number;
} {
  const itemsQuantity = Number(input.itemsQuantity);
  const itemsPrice = Number(input.itemsPrice);
  const shippingPrice = Number(input.shippingPrice);
  const totalPrice = Number(input.totalPrice);
  if (
    !Number.isFinite(itemsQuantity) ||
    !Number.isInteger(itemsQuantity) ||
    itemsQuantity < 1
  ) {
    throw new GraphQLError(t("invalidItemsQuantity"));
  }
  if (!Number.isFinite(itemsPrice) || itemsPrice < 0) {
    throw new GraphQLError(t("invalidItemsPrice"));
  }
  if (!Number.isFinite(shippingPrice) || shippingPrice < 0) {
    throw new GraphQLError(t("invalidShippingPrice"));
  }
  if (!Number.isFinite(totalPrice) || totalPrice < 0) {
    throw new GraphQLError(t("invalidTotalPrice"));
  }
  return { itemsQuantity, itemsPrice, shippingPrice, totalPrice };
}

type AdminOverviewSalesPoint = {
  date: string;
  total: number;
};

type AdminOverview = {
  productsCount: number;
  usersCount: number;
  ordersCount: number;
  reviewsCount: number;
  totalSales: number;
  salesByDate: AdminOverviewSalesPoint[];
  recentOrders: ReturnType<typeof findAllOrders>;
};

const root = {
  hello: () => "Hello from GraphQL (ESM)",
  currency: () => (process.env.CURRENCY ?? "PLN").toUpperCase(),
  products: () => findAllProducts(),
  product: ({ id }: { id: string }) => findProductById(id),
  users: (
    _args: unknown,
    context: GraphQLContext
  ) => {
     if (!context?.userId) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    const currentUser = findUserById(context.userId);
    if (!currentUser || !currentUser.isAdmin) {
      throw new GraphQLError(context.t("forbidden"));
    }
    return findAllUsers();
  },
  searchProducts: ({ query }: { query: string }) => searchProducts(query),
  
  searchUsers: (
    { query }: { query: string },
    context: GraphQLContext
  ) => {
    if (!context?.userId) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    const currentUser = findUserById(context.userId);
    if (!currentUser || !currentUser.isAdmin) {
      throw new GraphQLError(context.t("forbidden"));
    }
    return searchUsers(query);
  },
  searchOrders: (
    { query }: { query: string },
    context: GraphQLContext
  ) => {
    if (!context?.userId) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    const currentUser = findUserById(context.userId);
    if (!currentUser || !currentUser.isAdmin) {
      throw new GraphQLError(context.t("forbidden"));
    }
    return withOrderItemImagesList(searchOrders(query));
  },
  searchReviews: (
    { query }: { query: string },
    context: GraphQLContext
  ) => {
    if (!context?.userId) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    const currentUser = findUserById(context.userId);
    if (!currentUser || !currentUser.isAdmin) {
      throw new GraphQLError(context.t("forbidden"));
    }
    return searchReviews(query);
  },
  adminOverview: (
    _args: unknown,
    context: GraphQLContext
  ): AdminOverview => {
    if (!context?.userId) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    const currentUser = findUserById(context.userId);
    if (!currentUser || !currentUser.isAdmin) {
      throw new GraphQLError(context.t("forbidden"));
    }

    const products = findAllProducts();
    const users = findAllUsers();
    const orders = findAllOrders();
    const reviews = findAllReviews();
    return {
      productsCount: products.length,
      usersCount: users.length,
      ordersCount: orders.length,
      reviewsCount: reviews.length,
      totalSales: orders.reduce((acc, order) => acc + order.totalPrice, 0),
      salesByDate: orders.map((order) => ({
        date: order.createdAt,
        total: order.totalPrice,
      })),
      recentOrders: withOrderItemImagesList(orders.slice(0, 3)),
    };
  },
  register: async (
    {
      input,
    }: {
      input: { name: string; email: string; password: string };
    },
    context: GraphQLContext
  ) => {
    const { t } = context;
    const { name, email, password } = input;
    // Validation for name
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      throw new GraphQLError(t("registerNameMinLength"));
    }
    // Validation for email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
      throw new GraphQLError(t("emailInvalid"));
    }
    // Validation for password
    if (
      !password ||
      typeof password !== "string" ||
      password.trim().length < 6
    ) {
      throw new GraphQLError(t("passwordMinLength"));
    }
    const existing = findUserByEmail(email);
    if (existing) {
      throw new GraphQLError(t("emailAlreadyRegistered"));
    }
    const user = await createUser(name, email, password);
    return { token: signToken(user.id), user };
  },
  login: async (
    { email, password }: { email: string; password: string },
    context: GraphQLContext
  ) => {
    // Validation for email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
      throw new GraphQLError(context.t("emailInvalid"));
    }
    // Validation for password
    if (
      !password ||
      typeof password !== "string" ||
      password.trim().length < 6
    ) {
      throw new GraphQLError(context.t("passwordInvalid"));
    }
    const row = findUserByEmail(email);
    if (!row || !(await verifyPassword(password, row.password))) {
      throw new GraphQLError(context.t("invalidCredentials"));
    }
    const user = toUser(row);
    return { token: signToken(user.id), user };
  },
  updateUser: async (
    args: {
      input?: { id: string; name?: string; email?: string; password?: string };
    },
    context: GraphQLContext
  ) => {
    const input = args?.input;
    if (!input) {
      throw new GraphQLError(context.t("inputRequired"));
    }
    const { id, name, email, password } = input;
    if (!id || typeof id !== "string") {
      throw new GraphQLError(context.t("userIdRequired"));
    }
    if (!context?.userId) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    const currentUser = findUserById(context.userId);
    if (!currentUser) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    if (currentUser.id !== id && !currentUser.isAdmin) {
      throw new GraphQLError(context.t("forbidden"));
    }
    if (!name && !email && !password) {
      throw new GraphQLError(context.t("updateProfileAtLeastOneField"));
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

   
    if (name !== undefined && name !== null) {
      if (typeof name !== "string" || name.trim().length < 2) {
        throw new GraphQLError(context.t("nameMinLength"));
      }
    }
    if (email !== undefined && email !== null) {
      if (typeof email !== "string" || !emailRegex.test(email.trim())) {
        throw new GraphQLError(context.t("emailInvalid"));
      }
    }
    if (password !== undefined && password !== null) {
      if (typeof password !== "string" || password.trim().length < 6) {
        throw new GraphQLError(context.t("passwordMinLength"));
      }
    }
    try {
      return await updateUser({ id, name, email, password });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("updateUser failed:", err);
      throw new GraphQLError(context.t("failedToUpdateUser"));
    }
  },
  updateProduct: (
    {
      input,
    }: {
      input: {
        id: string;
        title?: string;
        description?: string;
        price?: number;
        countInStock?: number;
        isFeatured?: boolean;
        images?: string[];
        banners?: string[];
      };
    },
    context: GraphQLContext
  ) => {
    if (!input) {
      throw new GraphQLError(context.t("inputRequired"));
    }
    if (!context?.userId) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    const currentUser = findUserById(context.userId);
    if (!currentUser || !currentUser.isAdmin) {
      throw new GraphQLError(context.t("forbidden"));
    }
    const {
      id,
      title,
      description,
      price,
      countInStock,
      isFeatured,
      images,
      banners,
    } = input;
    if (!id || typeof id !== "string") {
      throw new GraphQLError(context.t("productIdRequired"));
    }
    if (
      title === undefined &&
      description === undefined &&
      price === undefined &&
      countInStock === undefined &&
      isFeatured === undefined &&
      images === undefined &&
      banners === undefined
    ) {
      throw new GraphQLError(context.t("updateProductAtLeastOneField"));
    }
    if (price !== undefined) {
      if (typeof price !== "number" || Number.isNaN(price) || price < 0) {
        throw new GraphQLError(context.t("priceNonNegative"));
      }
    }
    if (countInStock !== undefined) {
      if (
        typeof countInStock !== "number" ||
        !Number.isInteger(countInStock) ||
        countInStock < 0
      ) {
        throw new GraphQLError(context.t("countInStockNonNegativeInteger"));
      }
    }
    if (images !== undefined) {
      if (!Array.isArray(images)) {
        throw new GraphQLError(context.t("imagesMustBeStringArray"));
      }
      for (const img of images) {
        if (typeof img !== "string" || !img.trim()) {
          throw new GraphQLError(context.t("eachImageEntryNonEmptyString"));
        }
      }
    }
    if (banners !== undefined) {
      if (!Array.isArray(banners)) {
        throw new GraphQLError(context.t("bannersMustBeStringArray"));
      }
      for (const b of banners) {
        if (typeof b !== "string" || !b.trim()) {
          throw new GraphQLError(context.t("eachBannerEntryNonEmptyString"));
        }
      }
    }
    // If images or banners are being updated, remove any old files that are no longer referenced.
    if (images !== undefined || banners !== undefined) {
      const existing = findProductById(id);
      if (existing) {
        const newImages = images ?? existing.images ?? [];
        const newBanners = banners ?? existing.banners ?? [];
        const newRefs = new Set([...newImages, ...newBanners]);
        const oldRefs = [
          ...(existing.images ?? []),
          ...(existing.banners ?? []),
        ];

        for (const ref of oldRefs) {
          if (!ref || typeof ref !== "string") continue;
          if (newRefs.has(ref)) continue; // still in use

          let filename = ref;
          try {
            const url = new URL(ref, "http://dummy");
            const pathname = url.pathname;
            const lastSlash = pathname.lastIndexOf("/");
            filename =
              lastSlash >= 0 ? pathname.slice(lastSlash + 1) : pathname;
          } catch {
            const lastSlash = ref.lastIndexOf("/");
            if (lastSlash >= 0) {
              filename = ref.slice(lastSlash + 1);
            }
          }

          if (filename.includes("%")) {
            try {
              filename = decodeURIComponent(filename);
            } catch {
              // ignore decode errors and fall back to original filename
            }
          }

          const fullPath = path.join(imagesDir, filename);
          if (existsSync(fullPath)) {
            try {
              unlinkSync(fullPath);
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error("Failed to delete old product image:", fullPath, err);
            }
          }
        }
      }
    }

    const updated = updateProductById(id, {
      title,
      description,
      price,
      countInStock,
      isFeatured,
      images,
      banners,
    });
    if (!updated) {
      throw new GraphQLError(context.t("productNotFound"));
    }
    return updated;
  },
  createProduct: (_args: unknown, context: GraphQLContext) => {
    if (!context?.userId) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    const currentUser = findUserById(context.userId);
    if (!currentUser || !currentUser.isAdmin) {
      throw new GraphQLError(context.t("forbidden"));
    }
    return createProductModel();
  },
  deleteUser: ({ id }: { id: string }, context: GraphQLContext) => {
    if (!context?.userId) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    const currentUser = findUserById(context.userId);
    if (!currentUser || !currentUser.isAdmin) {
      throw new GraphQLError(context.t("forbidden"));
    }
    if (!id || typeof id !== "string") {
      throw new GraphQLError(context.t("userIdRequired"));
    }
    const targetUser = findUserById(id);
    if (!targetUser) {
      throw new GraphQLError(context.t("userNotFound"));
    }
    if (targetUser.isAdmin) {
      throw new GraphQLError(context.t("cannotDeleteAdminUser"));
    }
    return deleteUserById(id);
  },
  deleteProduct: (
    { id }: { id: string },
    context: GraphQLContext
  ) => {
    if (!context?.userId) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    const currentUser = findUserById(context.userId);
    if (!currentUser || !currentUser.isAdmin) {
      throw new GraphQLError(context.t("forbidden"));
    }
    if (!id || typeof id !== "string") {
      throw new GraphQLError(context.t("productIdRequired"));
    }

    const product = findProductById(id);
    if (!product) {
      throw new GraphQLError(context.t("productNotFound"));
    }

    const allImageRefs = [...(product.images ?? []), ...(product.banners ?? [])];

    console.log("allImageRefs:", allImageRefs);

    for (const ref of allImageRefs) {
      if (!ref || typeof ref !== "string") continue;

      let filename = ref;
      try {
        // Handle full URLs like "http://.../uploads/filename.jpg"
        const url = new URL(ref, "http://dummy");
        const pathname = url.pathname;
        const lastSlash = pathname.lastIndexOf("/");
        filename = lastSlash >= 0 ? pathname.slice(lastSlash + 1) : pathname;
      } catch {
        const lastSlash = ref.lastIndexOf("/");
        if (lastSlash >= 0) {
          filename = ref.slice(lastSlash + 1);
        }
      }

      // If the filename is percent-encoded (e.g. contains %C3...), decode it so it
      // matches the actual filename on disk (especially important on Windows).
      if (filename.includes("%")) {
        try {
          filename = decodeURIComponent(filename);
        } catch {
          // ignore decode errors and fall back to original filename
        }
      }

      const fullPath = path.join(imagesDir, filename);
      console.log("fullPath:", fullPath);
      if (existsSync(fullPath)) {
        try {
          unlinkSync(fullPath);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("Failed to delete product image:", fullPath, err);
        }
      }
    }

    return deleteProductById(id);
  },
  orders: (
    _args: unknown,
    context: GraphQLContext
  ) => {
    if (!context?.userId) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    const currentUser = findUserById(context.userId);
    if (!currentUser || !currentUser.isAdmin) {
      throw new GraphQLError(context.t("forbidden"));
    }
    return withOrderItemImagesList(findAllOrders());
  },
  order: (
    { id }: { id: string },
    context: GraphQLContext
  ) => {
    if (!context?.userId) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    const currentUser = findUserById(context.userId);
    if (!currentUser) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    if (!id || typeof id !== "string") {
      throw new GraphQLError(context.t("orderIdRequired"));
    }
    const order = findOrderById(id);
    if (!order) {
      throw new GraphQLError(context.t("orderNotFound"));
    }
    if (!currentUser.isAdmin && order.user.id !== currentUser.id) {
      throw new GraphQLError(context.t("forbidden"));
    }
    return withOrderItemImages(order);
  },
  myOrders: (
    _args: unknown,
    context: GraphQLContext
  ) => {
    if (!context?.userId) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    return withOrderItemImagesList(findOrdersByUserId(context.userId));
  },
  deleteOrder: (
    { id }: { id: string },
    context: GraphQLContext
  ) => {
    if (!context?.userId) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    const currentUser = findUserById(context.userId);
    if (!currentUser || !currentUser.isAdmin) {
      throw new GraphQLError(context.t("forbidden"));
    }
    if (!id || typeof id !== "string") {
      throw new GraphQLError(context.t("orderIdRequired"));
    }
    return deleteOrderById(id);
  },
  reviews: (_args: unknown, context: GraphQLContext) => {
    if (!context?.userId) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    const currentUser = findUserById(context.userId);
    if (!currentUser || !currentUser.isAdmin) {
      throw new GraphQLError(context.t("forbidden"));
    }
    return findAllReviews();
  },
  myReviews: (
    _args: unknown,
    context: GraphQLContext
  ) => {
    if (!context?.userId) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    return findReviewsByUserId(context.userId);
  },
  productReviews: (
    { productId }: { productId: string },
    context: GraphQLContext
  ) => {
    if (!productId || typeof productId !== "string") {
      throw new GraphQLError(context.t("productIdRequired"));
    }
    return findReviewsByProductId(productId);
  },
  chatMessages: (
    { orderId }: { orderId: string },
    context: GraphQLContext
  ) => {
    if (!context?.userId) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    if (!orderId || typeof orderId !== "string") {
      throw new GraphQLError(context.t("orderIdRequired"));
    }

    const currentUser = findUserById(context.userId);
    if (!currentUser) {
      throw new GraphQLError(context.t("unauthorized"));
    }

    const order = findOrderById(orderId);
    if (!order) {
      throw new GraphQLError(context.t("orderNotFound"));
    }

    if (!currentUser.isAdmin && order.user.id !== currentUser.id) {
      throw new GraphQLError(context.t("forbidden"));
    }

    return findChatMessagesByOrderId(orderId);
  },
  deleteReview: (
    { id }: { id: string },
    context: GraphQLContext
  ) => {
    if (!context?.userId) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    const currentUser = findUserById(context.userId);
    if (!currentUser || !currentUser.isAdmin) {
      throw new GraphQLError(context.t("forbidden"));
    }
    if (!id || typeof id !== "string") {
      throw new GraphQLError(context.t("reviewIdRequired"));
    }
    return deleteReviewById(id);
  },
  createReview: (
    { input }: { input: { productId: string; rating: number; comment: string } },
    context: GraphQLContext
  ) => {
    if (!context?.userId) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    if (!input) {
      throw new GraphQLError(context.t("inputRequired"));
    }

    const { productId, rating, comment } = input;
    if (!productId || typeof productId !== "string") {
      throw new GraphQLError(context.t("productIdRequired"));
    }
    if (!Number.isInteger(rating)) {
      throw new GraphQLError(context.t("ratingInteger"));
    }
    if (rating < 1 || rating > 5) {
      throw new GraphQLError(context.t("ratingBetween1And5"));
    }

    const trimmedComment = (comment ?? "").trim();
    if (trimmedComment.length < 3) {
      throw new GraphQLError(context.t("commentMinLength"));
    }
    if (trimmedComment.length > 2000) {
      throw new GraphQLError(context.t("commentTooLong"));
    }

    try {
      return createReviewByUser({
        userId: context.userId,
        productId,
        rating,
        comment: trimmedComment,
      });
    } catch (e) {
      if (e instanceof Error) {
        if (e.message === "You have already reviewed this product.") {
          throw new GraphQLError(context.t("alreadyReviewedProduct"));
        }
        if (e.message === "Product not found") {
          throw new GraphQLError(context.t("productNotFound"));
        }
        if (e.message === "Failed to create review.") {
          throw new GraphQLError(context.t("failedToCreateReview"));
        }
      }
      throw e;
    }
  },
  sendContactMessage: async (
    {
      input,
    }: {
      input: {
        email: string;
        message: string;
      };
    },
    context: GraphQLContext
  ) => {
    const { t } = context;
    const { email, message } = input ?? {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
      throw new GraphQLError(t("emailInvalid"));
    }

    if (!message || typeof message !== "string" || message.trim().length < 5) {
      throw new GraphQLError(t("contactMessageMinLength"));
    }

    if (message.length > 2000) {
      throw new GraphQLError(t("contactMessageTooLong"));
    }

    try {
      await sendContactEmail({
        fromEmail: email.trim(),
        message: message.trim(),
      });
      return { success: true, error: null };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to send contact message:", err);
      return { success: false, error: t("contactSendFailed") };
    }
  },
  createStripePaymentIntent: async (
    {
      input,
    }: {
      input?: {
        items?: OrderItem[];
        itemsQuantity?: unknown;
        itemsPrice?: unknown;
        shippingPrice?: unknown;
        totalPrice?: unknown;
      };
    },
    context: GraphQLContext
  ) => {
    if (!context?.userId) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    const currentUser = findUserById(context.userId);
    if (!currentUser) {
      throw new GraphQLError(context.t("unauthorized"));
    }

    const { t } = context;
    const items = input?.items;
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new GraphQLError(t("orderItemsRequired"));
    }

    const lines = items.map((item) => ({
      productId: String(item.productId),
      quantity: Number(item.quantity),
    }));

    for (const line of lines) {
      if (!line.productId) {
        throw new GraphQLError(t("orderItemProductIdRequired"));
      }
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
        throw new GraphQLError(t("orderItemPositiveQuantity"));
      }
    }

    const resolvedItems = resolveOrderItemsFromDatabase(lines, t);

    assertStockAvailableForLines(
      resolvedItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      t
    );

    const serverTotals = computeOrderTotalsFromItems(resolvedItems);
    const clientTotals = parseClientOrderTotalsFields(input ?? {}, t);
    assertClientOrderTotalsMatch(clientTotals, serverTotals, t);

    const amount = toMinorUnits(serverTotals.totalPrice);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new GraphQLError(t("calculatedAmountInvalid"));
    }

    const stripe = await getStripe(t);
    const pi = await stripe.paymentIntents.create({
      amount,
      currency: CURRENCY,
      automatic_payment_methods: { enabled: true },
      metadata: { userId: currentUser.id },
    });

   

    if (!pi.client_secret) {
      throw new GraphQLError(t("stripePaymentIntentFailed"));
    }

    return { clientSecret: pi.client_secret, paymentIntentId: pi.id };
  },
  createPayPalOrder: async (
    {
      input,
    }: {
      input?: {
        items?: OrderItem[];
        itemsQuantity?: unknown;
        itemsPrice?: unknown;
        shippingPrice?: unknown;
        totalPrice?: unknown;
      };
    },
    context: GraphQLContext
  ) => {
    const { t } = context;
    if (!context?.userId) {
      throw new GraphQLError(t("unauthorized"));
    }
    const currentUser = findUserById(context.userId);
    if (!currentUser) {
      throw new GraphQLError(t("unauthorized"));
    }

    const items = input?.items;
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new GraphQLError(t("orderItemsRequired"));
    }

    const lines = items.map((item) => ({
      productId: String(item.productId),
      quantity: Number(item.quantity),
    }));

    for (const line of lines) {
      if (!line.productId) {
        throw new GraphQLError(t("orderItemProductIdRequired"));
      }
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
        throw new GraphQLError(t("orderItemPositiveQuantity"));
      }
    }

    const resolvedItems = resolveOrderItemsFromDatabase(lines, t);
    assertStockAvailableForLines(
      resolvedItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      t
    );

    const serverTotals = computeOrderTotalsFromItems(resolvedItems);
    const clientTotals = parseClientOrderTotalsFields(input ?? {}, t);
    assertClientOrderTotalsMatch(clientTotals, serverTotals, t);

    const amountValue = toPayPalMajorUnitString(serverTotals.totalPrice);
    if (!Number.isFinite(Number(amountValue)) || Number(amountValue) <= 0) {
      throw new GraphQLError(t("calculatedAmountInvalid"));
    }

    try {
      return await createPayPalCheckoutOrder({
        amountValue,
        currencyCode: (process.env.CURRENCY ?? "PLN").toUpperCase(),
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("createPayPalCheckoutOrder failed:", err);
      throw new GraphQLError(t("failedToCreatePayPalOrder"));
    }
  },
  placeOrder: async (
    {
      input,
    }: {
      input?: {
        items?: OrderItem[];
        shippingAddress?: OrderShippingAddress;
        paymentMethod?: string;
        stripePaymentIntentId?: string | null;
        paypalOrderId?: string | null;
        itemsQuantity?: unknown;
        itemsPrice?: unknown;
        shippingPrice?: unknown;
        totalPrice?: unknown;
      };
    },
    context: GraphQLContext
  ) => {
    const { t } = context;

    if (!context?.userId) {
      throw new GraphQLError(t("unauthorized"));
    }
    const currentUser = findUserById(context.userId);
    if (!currentUser) {
      throw new GraphQLError(t("unauthorized"));
    }

    if (!input) {
      throw new GraphQLError(t("inputRequired"));
    }

    const {
      items,
      shippingAddress,
      paymentMethod,
      stripePaymentIntentId,
      paypalOrderId,
    } = input;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new GraphQLError(t("orderItemsRequired"));
    }

    const lines = items.map((item) => ({
      productId: String(item.productId),
      quantity: Number(item.quantity),
    }));

    for (const line of lines) {
      if (!line.productId) {
        throw new GraphQLError(t("orderItemProductIdRequired"));
      }
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
        throw new GraphQLError(t("orderItemPositiveQuantity"));
      }
    }

    if (!shippingAddress) {
      throw new GraphQLError(t("shippingAddressRequired"));
    }

    const normalizedShippingAddress: OrderShippingAddress = {
      name: String(shippingAddress.name ?? "").trim(),
      addressLine1: String(shippingAddress.addressLine1 ?? "").trim(),
      addressLine2:
        shippingAddress.addressLine2 !== undefined
          ? String(shippingAddress.addressLine2).trim()
          : null,
      postalCode: String(shippingAddress.postalCode ?? "").trim(),
      city: String(shippingAddress.city ?? "").trim(),
      country: String(shippingAddress.country ?? "").trim(),
    };

    if (!normalizedShippingAddress.name) {
      throw new GraphQLError(t("shippingNameRequired"));
    }
    if (!normalizedShippingAddress.addressLine1) {
      throw new GraphQLError(t("shippingAddressLine1Required"));
    }
    if (!normalizedShippingAddress.postalCode) {
      throw new GraphQLError(t("shippingPostalCodeRequired"));
    }
    if (!normalizedShippingAddress.city) {
      throw new GraphQLError(t("shippingCityRequired"));
    }
    if (!normalizedShippingAddress.country) {
      throw new GraphQLError(t("shippingCountryRequired"));
    }

    if (!paymentMethod || typeof paymentMethod !== "string") {
      throw new GraphQLError(t("paymentMethodRequired"));
    }
    if (stripePaymentIntentId !== undefined && stripePaymentIntentId !== null) {
      if (typeof stripePaymentIntentId !== "string" || !stripePaymentIntentId) {
        throw new GraphQLError(t("stripePaymentIntentIdNonEmpty"));
      }
    }
    if (paypalOrderId !== undefined && paypalOrderId !== null) {
      if (typeof paypalOrderId !== "string" || !paypalOrderId) {
        throw new GraphQLError(t("paypalOrderIdNonEmpty"));
      }
    }

    const resolvedItems = resolveOrderItemsFromDatabase(lines, t);

    const serverTotals = computeOrderTotalsFromItems(resolvedItems);
    const clientTotals = parseClientOrderTotalsFields(input, t);
    assertClientOrderTotalsMatch(clientTotals, serverTotals, t);

    const normalizedPaymentMethod = paymentMethod.trim().toLowerCase();
    if (normalizedPaymentMethod === "paypal") {
      if (!paypalOrderId) {
        throw new GraphQLError(t("paypalOrderIdRequiredForPayment"));
      }

      let captured: Awaited<ReturnType<typeof capturePayPalOrder>>;
      try {
        captured = await capturePayPalOrder(paypalOrderId);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("capturePayPalOrder failed:", err);
        throw new GraphQLError(t("failedToCapturePayPal"));
      }

      if (captured.orderStatus !== "COMPLETED") {
        throw new GraphQLError(t("paypalOrderNotCompleted"));
      }
      if (captured.captureStatus !== "COMPLETED") {
        throw new GraphQLError(t("paypalCaptureNotCompleted"));
      }

      const expectedCurrency = (process.env.CURRENCY ?? "PLN").toUpperCase();
      if (captured.amountCurrencyCode.toUpperCase() !== expectedCurrency) {
        throw new GraphQLError(t("paypalCurrencyMismatch"));
      }

      const expectedAmount = toPayPalMajorUnitString(serverTotals.totalPrice);
      if (captured.amountValue !== expectedAmount) {
        throw new GraphQLError(t("paypalAmountMismatch"));
      }

      return withOrderItemImages(
        createOrder({
          userId: currentUser.id,
          items: resolvedItems,
          shippingAddress: normalizedShippingAddress,
          paymentMethod: normalizedPaymentMethod,
          stripePaymentIntentId: null,
          paypalCaptureId: captured.captureId,
          isPaid: true,
          paidAt: new Date().toISOString(),
          totalPrice: serverTotals.totalPrice,
          t,
        })
      );
    }

    return withOrderItemImages(
      createOrder({
        userId: currentUser.id,
        items: resolvedItems,
        shippingAddress: normalizedShippingAddress,
        paymentMethod: normalizedPaymentMethod,
        stripePaymentIntentId:
          normalizedPaymentMethod === "stripe" ? (stripePaymentIntentId ?? null) : null,
        totalPrice: serverTotals.totalPrice,
        t,
      })
    );
  },
  markOrderDelivered: (
    { id }: { id: string },
    context: GraphQLContext
  ) => {
    if (!context?.userId) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    const currentUser = findUserById(context.userId);
    if (!currentUser) {
      throw new GraphQLError(context.t("unauthorized"));
    }
    if (!currentUser.isAdmin) {
      throw new GraphQLError(context.t("forbidden"));
    }
    if (!id || typeof id !== "string") {
      throw new GraphQLError(context.t("orderIdRequired"));
    }
    const order = findOrderById(id);
    if (!order) {
      throw new GraphQLError(context.t("orderNotFound"));
    }
    if (!order.isPaid) {
      throw new GraphQLError(context.t("orderMustBePaidBeforeDelivery"));
    }
    if (order.isDelivered) return withOrderItemImages(order);
    const updated = markOrderDeliveredById(id);
    if (!updated) {
      throw new GraphQLError(context.t("failedToMarkDelivered"));
    }
    return withOrderItemImages(updated);
  },
  // Exported for webhook usage in server.ts (rootValue is shared).
  _internalSetOrderPaidByStripePaymentIntentId: ({
    stripePaymentIntentId,
  }: {
    stripePaymentIntentId: string;
  }) =>
    setOrderPaidByStripePaymentIntentId(stripePaymentIntentId).order,
  storeLocation: async () => {
    try {
      const coords = await getCoordsForAddress(ADDRESS);
      return {
        name: ADDRESS,
        latitude: coords.lat,
        longitude: coords.lng,
      };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        "storeLocation resolver failed, falling back to static:",
        err
      );
      return {
        name: ADDRESS,
        latitude: 0,
        longitude: 0,
      };
    }
  },
};

export default root;
