import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import {
  redirect,
  useFetcher,
  useLoaderData,
  useLocation,
  useRevalidator,
} from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useEffect } from "react";
import { resolveImageUrl } from "../utils/imageUrl";
import OrderSummary from "../components/OrderSummary";
import OrderChat from "../components/OrderChat";
import { getAuthHeader } from "../../utils/auth";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { clearCart } from "../store/cartSlice";
import { useCurrency } from "../context/CurrencyContext";
import { formatMoneyIso } from "../utils/money";
import { useTranslation } from "react-i18next";
import { getLocaleFromRequest, localizedLoginPath } from "../i18n/locales";
import { graphqlFetchHeaders } from "../lib/graphqlHeaders";
import { graphqlHttpPost } from "../lib/graphqlClient";
import { serverT } from "../i18n/i18n";
import { store } from "../store/store";
import { logout } from "../store/authSlice";

const ORDER_QUERY = `
  query Order($id: ID!) {
    order(id: $id) {
      id
      createdAt
      totalPrice
      paymentMethod
      isPaid
      paidAt
      isDelivered
      deliveredAt
      shippingAddress {
        name
        addressLine1
        addressLine2
        postalCode
        city
        country
      }
      items {
        productId
        title
        quantity
        price
        image
      }
    }
  }
`;

const MARK_ORDER_DELIVERED_MUTATION = `
  mutation MarkOrderDelivered($id: ID!) {
    markOrderDelivered(id: $id) {
      id
      isDelivered
      deliveredAt
    }
  }
`;

export type OrderItem = {
  productId: string;
  title: string;
  quantity: number;
  price: number;
  image?: string | null;
};

type ShippingAddress = {
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  postalCode: string;
  city: string;
  country: string;
};

export type OrderData = {
  id: string;
  createdAt: string;
  totalPrice: number;
  paymentMethod: string;
  isPaid: boolean;
  paidAt?: string | null;
  isDelivered: boolean;
  deliveredAt?: string | null;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
};

export type OrderLoaderData =
  | { ok: true; order: OrderData }
  | {
      ok: false;
      code: "login_required" | "load_failed" | "not_found";
      message?: string;
    };

export async function loader({ params, request }: LoaderFunctionArgs) {
  const orderId = params.orderId;
  if (!orderId) {
    return { ok: false as const, code: "not_found" as const };
  }

  const auth = getAuthHeader();
  if (!auth) {
    return { ok: false as const, code: "login_required" as const };
  }

  const lng = getLocaleFromRequest(request);
  const headers = graphqlFetchHeaders(lng, auth);

  try {
    const response = await graphqlHttpPost({
      query: ORDER_QUERY,
      variables: { id: orderId },
      headers,
    });
    const json = (await response.json()) as {
      data?: { order?: OrderData | null };
      errors?: { message?: string }[];
    };
    if (!response.ok || json.errors || !json.data?.order) {
      return {
        ok: false as const,
        code: "load_failed" as const,
        message:
          json.errors && json.errors.length > 0
            ? json.errors[0]?.message
            : undefined,
      };
    }
    return { ok: true as const, order: json.data.order };
  } catch (err) {
    console.error("Failed to load order", err);
    return { ok: false as const, code: "load_failed" as const };
  }
}

type MarkDeliveredActionData = { error: string };

export async function action({ request, params }: ActionFunctionArgs) {
  const lng = getLocaleFromRequest(request);
  const formData = await request.formData();
  const intent = formData.get("_intent");
  if (intent !== "markDelivered") {
    return { error: serverT("order.markDeliverFailed", lng) };
  }

  const orderId = params.orderId;
  if (!orderId) {
    return { error: serverT("order.markDeliverFailed", lng) };
  }

  const auth = getAuthHeader();
  if (!auth) {
    return redirect(localizedLoginPath(request));
  }
  const headers = graphqlFetchHeaders(lng, auth);

  try {
    const response = await graphqlHttpPost({
      query: MARK_ORDER_DELIVERED_MUTATION,
      variables: { id: orderId },
      headers,
    });

    const json = (await response.json()) as {
      data?: { markOrderDelivered?: Partial<OrderData> };
      errors?: { message?: string }[];
    };

    if (json.errors) {
      const message = json.errors[0]?.message ?? "";
      const lower = message.toLowerCase();
      if (
        lower === "unauthorized" ||
        lower === "forbidden" ||
        lower.includes("brak autoryzacji") ||
        lower.includes("brak uprawnień")
      ) {
        store.dispatch(logout());
        return redirect(localizedLoginPath(request));
      }
      return {
        error:
          json.errors[0]?.message ?? serverT("order.markDeliverFailed", lng),
      } satisfies MarkDeliveredActionData;
    }

    if (!response.ok) {
      return { error: serverT("order.markDeliverFailed", lng) };
    }

    if (!json.data?.markOrderDelivered) {
      return { error: serverT("order.markDeliverFailed", lng) };
    }

    return redirect(request.url);
  } catch (err) {
    console.error("Failed to mark as delivered", err);
    return { error: serverT("order.markDeliverFailed", lng) };
  }
}

const OrderPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const userInfo = useAppSelector((state) => state.auth.userInfo);
  const { currency } = useCurrency();
  const data = useLoaderData() as OrderLoaderData;
  const revalidator = useRevalidator();
  const fetcher = useFetcher<MarkDeliveredActionData>();

  useEffect(() => {
    if (
      location.state &&
      (location.state as { clearCart?: boolean }).clearCart
    ) {
      dispatch(clearCart());
    }
  }, [location.state, dispatch]);

  useEffect(() => {
    if (!data.ok) return;
    const order = data.order;
    if (order.paymentMethod !== "stripe") return;
    if (order.isPaid) return;

    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      revalidator.revalidate();
      if (attempts >= 6) {
        window.clearInterval(interval);
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [data, revalidator]);

  const markDeliverPending = fetcher.state !== "idle";
  const markDeliverError =
    fetcher.data && "error" in fetcher.data ? fetcher.data.error : null;

  if (!data.ok) {
    let message: string;
    if (data.code === "login_required") {
      message = t("order.loginRequired");
    } else if (data.code === "not_found") {
      message = t("order.notFound");
    } else {
      message = data.message ?? t("order.loadFailed");
    }
    return (
      <Box sx={{ py: 2 }}>
        <Typography color="error">{message}</Typography>
      </Box>
    );
  }

  const { order } = data;

  const itemsTotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shippingDisplay = Math.max(0, order.totalPrice - itemsTotal);

  const showThankYouMessage = !userInfo?.isAdmin;

  return (
    <Box sx={{ py: 2 }}>
      <Container maxWidth="lg">
        {showThankYouMessage ? (
          <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
            {t("order.thankYou")}
          </Typography>
        ) : (
          <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
            {t("order.details")}
          </Typography>
        )}
        <Typography variant="body2" sx={{ mb: 3 }}>
          {t("order.orderId")} {order.id} • {t("order.placedOn")}{" "}
          {new Date(order.createdAt).toLocaleString()}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
              gap: 3,
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    {t("order.orderItems")}
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t("order.tableItem")}</TableCell>
                        <TableCell align="right">
                          {t("order.tableQty")}
                        </TableCell>
                        <TableCell align="right">
                          {t("order.tablePrice")}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {order.items.map((item) => (
                        <TableRow key={item.productId}>
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                              }}
                            >
                              <Avatar
                                src={
                                  resolveImageUrl(item.image) ?? undefined
                                }
                                alt={item.title}
                                sx={{ width: 50, height: 50 }}
                              />
                              <Typography variant="body2">
                                {item.title}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">
                            {formatMoneyIso(
                              item.price * item.quantity,
                              currency
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    {t("order.shipping")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.shippingAddress.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.shippingAddress.addressLine1}{" "}
                    {order.shippingAddress.addressLine2}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.shippingAddress.postalCode}{" "}
                    {order.shippingAddress.city}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.shippingAddress.country}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 1,
                      color: order.isDelivered ? "success.main" : "error.main",
                      fontWeight: "bold",
                    }}
                  >
                    {order.isDelivered
                      ? t("order.delivered")
                      : t("order.notDelivered")}
                    {order.deliveredAt
                      ? ` • ${new Date(order.deliveredAt).toLocaleString()}`
                      : null}
                  </Typography>
                  {userInfo?.isAdmin && order.isPaid && !order.isDelivered ? (
                    <Box sx={{ mt: 2 }}>
                      {markDeliverError ? (
                        <Typography color="error" sx={{ mb: 1 }}>
                          {markDeliverError}
                        </Typography>
                      ) : null}
                      <Button
                        type="button"
                        variant="contained"
                        color="secondary"
                        disabled={markDeliverPending}
                        onClick={() => {
                          fetcher.submit(
                            { _intent: "markDelivered" },
                            { method: "post" }
                          );
                        }}
                      >
                        {t("order.markDelivered")}
                      </Button>
                    </Box>
                  ) : null}
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    {t("order.payment")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t(`payment.${order.paymentMethod}`, {
                      defaultValue: order.paymentMethod,
                    })}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 1,
                      color: order.isPaid ? "success.main" : "error.main",
                      fontWeight: "bold",
                    }}
                  >
                    {order.isPaid ? t("order.paid") : t("order.unpaid")}
                    {order.paidAt
                      ? ` • ${new Date(order.paidAt).toLocaleString()}`
                      : null}
                  </Typography>
                </CardContent>
              </Card>
              <OrderChat orderId={order.id} currentUserId={userInfo?.id} />
            </Box>
            <OrderSummary items={itemsTotal} shipping={shippingDisplay} />
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default OrderPage;
