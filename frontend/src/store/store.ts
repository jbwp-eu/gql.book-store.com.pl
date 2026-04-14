import { configureStore } from "@reduxjs/toolkit";
import { authSlice } from "./authSlice";
import { cartSlice } from "./cartSlice";

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    cart: cartSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
