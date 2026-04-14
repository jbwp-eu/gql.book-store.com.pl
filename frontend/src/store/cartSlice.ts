import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type CartItem = {
  productId: string;
  quantity: number;
  title?: string;
  price?: number;
  imageUrl?: string;
  /** Server stock when known (e.g. from product page); caps quantity in cart UI. */
  countInStock?: number;
};

export type ShippingAddress = {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
};

export type CartState = {
  items: CartItem[];
  shippingAddress: ShippingAddress | null;
  selectedPaymentMethod: string | null;
};

const initialState: CartState = {
  items: [],
  shippingAddress: null,
  selectedPaymentMethod: null,
};

export const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem: (
      state,
      action: PayloadAction<{
        productId: string;
        quantity?: number;
        title?: string;
        price?: number;
        imageUrl?: string;
        countInStock?: number;
      }>
    ) => {
      const {
        productId,
        quantity = 1,
        title,
        price,
        imageUrl,
        countInStock,
      } = action.payload;
      const existing = state.items.find((i) => i.productId === productId);
      if (existing) {
        existing.quantity += quantity;
        if (imageUrl !== undefined) existing.imageUrl = imageUrl;
        if (countInStock !== undefined) existing.countInStock = countInStock;
      } else {
        state.items.push({
          productId,
          quantity,
          ...(title !== undefined && { title }),
          ...(price !== undefined && { price }),
          ...(imageUrl !== undefined && { imageUrl }),
          ...(countInStock !== undefined && { countInStock }),
        });
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((i) => i.productId !== action.payload);
    },
    setQuantity: (
      state,
      action: PayloadAction<{ productId: string; quantity: number }>
    ) => {
      const item = state.items.find(
        (i) => i.productId === action.payload.productId
      );
      if (item) {
        if (action.payload.quantity <= 0) {
          state.items = state.items.filter(
            (i) => i.productId !== action.payload.productId
          );
        } else {
          item.quantity = action.payload.quantity;
        }
      }
    },
    clearCart: (state) => {
      state.items = [];
      state.shippingAddress = null;
      state.selectedPaymentMethod = null;
    },
    setPaymentMethod: (state, action: PayloadAction<string>) => {
      state.selectedPaymentMethod = action.payload;
    },
    setShippingAddress: (
      state,
      action: PayloadAction<ShippingAddress>
    ) => {
      state.shippingAddress = action.payload;
    },
  },
});

export const {
  addItem,
  removeItem,
  setQuantity,
  clearCart,
  setPaymentMethod,
  setShippingAddress,
} = cartSlice.actions;
