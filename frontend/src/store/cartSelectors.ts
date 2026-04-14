import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "./store";
import { computeCartTotals } from "../utils/shipping";

export const selectCartOrderTotals = createSelector(
  [(state: RootState) => state.cart.items],
  (items) => computeCartTotals(items)
);
