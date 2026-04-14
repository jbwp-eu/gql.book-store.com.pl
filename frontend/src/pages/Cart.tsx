import { Link } from "react-router";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import Add from "@mui/icons-material/Add";
import Remove from "@mui/icons-material/Remove";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  removeItem,
  setQuantity,
  clearCart,
  type CartItem,
} from "../store/cartSlice";
import { ArrowRightAlt } from "@mui/icons-material";
import CheckoutStepper from "../components/CheckoutStepper";
import { useLocale, useLocalizedHref } from "../hooks/useLocalizedPath";
import { withLocalePath } from "../i18n/locales";
import { useCurrency } from "../context/CurrencyContext";
import { formatMoneyIso } from "../utils/money";
import { useTranslation } from "react-i18next";

const lineTotal = (item: CartItem): number => (item.price ?? 0) * item.quantity;

const CartPage = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const locale = useLocale();
  const homeHref = useLocalizedHref("/");
  const shippingHref = useLocalizedHref("/shipping");
  const { currency } = useCurrency();
  const items = useAppSelector((state) => state.cart.items);
  // Calculate the subtotal of the cart by summing up the total price for each item.
  // For each cart item, lineTotal(item) returns the price times quantity for that item.
  // The reduce function accumulates these totals, starting from 0.
  const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);
  const isEmpty = items.length === 0;

  return (
    <Box
      sx={{
        py: 2,
        px: 2,
        backgroundColor: theme.palette.primary.main,
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        minHeight: "40vh",
      }}
    >
      <Container maxWidth="lg">
        <CheckoutStepper />
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          {t("cart.title")}
        </Typography>

        {isEmpty ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              {t("cart.empty")}
            </Typography>
            <Button
              component={Link}
              to={homeHref}
              variant="contained"
              color="secondary"
            >
              {t("cart.continueShopping")}
            </Button>
          </Box>
        ) : (
          <>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {items.map((item) => (
                <Card key={item.productId} variant="outlined">
                  <CardContent
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Box sx={{ flex: "1 1 200px", minWidth: 0 }}>
                      {item.title ? (
                        <>
                          <Typography variant="h6">{item.title}</Typography>
                          <Typography
                            component={Link}
                            to={withLocalePath(
                              locale,
                              `/product/${item.productId}`
                            )}
                            variant="body2"
                            color="secondary"
                            sx={{ display: "block", mt: 0.5 }}
                          >
                            {t("cart.viewProduct")}
                          </Typography>
                        </>
                      ) : (
                        <Typography
                          component={Link}
                          to={withLocalePath(
                            locale,
                            `/product/${item.productId}`
                          )}
                          variant="h6"
                          sx={{ textDecoration: "none", color: "secondary" }}
                        >
                          {t("cart.product")}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {item.price != null
                        ? formatMoneyIso(item.price, currency)
                        : "—"}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      <IconButton
                        size="small"
                        aria-label={t("cart.decreaseQty")}
                        onClick={() =>
                          dispatch(
                            setQuantity({
                              productId: item.productId,
                              quantity: Math.max(0, item.quantity - 1),
                            })
                          )
                        }
                      >
                        <Remove fontSize="small" />
                      </IconButton>
                      <Typography
                        component="span"
                        variant="body1"
                        sx={{ minWidth: 24, textAlign: "center" }}
                      >
                        {item.quantity}
                      </Typography>
                      <IconButton
                        size="small"
                        aria-label={t("cart.increaseQty")}
                        disabled={
                          item.countInStock != null &&
                          item.quantity >= item.countInStock
                        }
                        onClick={() => {
                          const max =
                            item.countInStock ?? Number.MAX_SAFE_INTEGER;
                          if (item.quantity >= max) return;
                          dispatch(
                            setQuantity({
                              productId: item.productId,
                              quantity: item.quantity + 1,
                            })
                          );
                        }}
                      >
                        <Add fontSize="small" />
                      </IconButton>
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                      {item.price != null
                        ? formatMoneyIso(lineTotal(item), currency)
                        : "—"}
                    </Typography>
                    <IconButton
                      aria-label={t("cart.removeFromCart")}
                      color="error"
                      onClick={() => dispatch(removeItem(item.productId))}
                    >
                      <DeleteOutline />
                    </IconButton>
                  </CardContent>
                </Card>
              ))}
            </Box>

            <Box
              sx={{
                mt: 3,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Typography variant="h6">
                {t("cart.subtotal")} {formatMoneyIso(subtotal, currency)}
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => dispatch(clearCart())}
                >
                  {t("cart.clearCart")}
                </Button>
                <Button
                  component={Link}
                  to={homeHref}
                  variant="outlined"
                  color="secondary"
                >
                  {t("cart.continueShopping")}
                </Button>
                <Button
                  component={Link}
                  to={shippingHref}
                  variant="contained"
                  color="secondary"
                  endIcon={
                    <span style={{ display: "flex", alignItems: "center" }}>
                      <ArrowRightAlt fontSize="medium" />
                    </span>
                  }
                >
                  {t("cart.checkout")}
                </Button>
              </Box>
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
};

export default CartPage;
