import { Link, Navigate, useNavigate } from "react-router";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setPaymentMethod, type CartItem } from "../store/cartSlice";
import { useState, useEffect } from "react";
import CheckoutStepper from "../components/CheckoutStepper";
import { useLocalizedHref } from "../hooks/useLocalizedPath";
import { useCurrency } from "../context/CurrencyContext";
import { formatMoneyIso } from "../utils/money";
import { useTranslation } from "react-i18next";

const lineTotal = (item: CartItem): number => (item.price ?? 0) * item.quantity;

const PAYMENT_METHOD_IDS = ["stripe", "paypal"] as const;

const PaymentPage = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const cartHref = useLocalizedHref("/cart");
  const shippingHref = useLocalizedHref("/shipping");
  const checkoutHref = useLocalizedHref("/checkout");
  const { currency } = useCurrency();
  const items = useAppSelector((state) => state.cart.items);
  const shippingAddress = useAppSelector((state) => state.cart.shippingAddress);
  const selectedId = useAppSelector(
    (state) => state.cart.selectedPaymentMethod
  );

  const [methodId, setMethodId] = useState<string>(selectedId ?? "");

  useEffect(() => {
    if (selectedId) setMethodId(selectedId);
  }, [selectedId]);

  const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);
  const isEmpty = items.length === 0;

  const handleContinue = () => {
    if (!methodId) return;
    dispatch(setPaymentMethod(methodId));
    navigate(checkoutHref);
  };

  if (isEmpty) {
    return <Navigate to={cartHref} replace />;
  }
  if (!shippingAddress) {
    return <Navigate to={shippingHref} replace />;
  }

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
          {t("payment.title")}
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 3,
            alignItems: "flex-start",
          }}
        >
          <Box sx={{ flex: "1 1 300px", minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              {t("payment.orderSummary", {
                count: items.length,
                amount: formatMoneyIso(subtotal, currency),
              })}
            </Typography>

            <FormControl component="fieldset" sx={{ width: "100%" }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                {t("payment.chooseMethod")}
              </Typography>
              <RadioGroup
                value={methodId}
                onChange={(_, value) => setMethodId(value)}
                name="payment-method"
              >
                {PAYMENT_METHOD_IDS.map((methodIdKey) => (
                  <FormControlLabel
                    key={methodIdKey}
                    value={methodIdKey}
                    control={
                      <Radio
                        sx={{
                          color: "secondary.main",
                          "&.Mui-checked": {
                            color: "secondary.main",
                          },
                        }}
                        checked={methodId === methodIdKey}
                      />
                    }
                    label={
                      <Typography
                        variant="body1"
                        sx={{
                          color:
                            methodId === methodIdKey
                              ? "secondary.main"
                              : "text.primary",
                          fontWeight:
                            methodId === methodIdKey ? "bold" : "normal",
                        }}
                      >
                        {t(`payment.${methodIdKey}`)}
                      </Typography>
                    }
                    sx={{
                      backgroundColor:
                        methodId === methodIdKey
                          ? "secondary.lighter"
                          : "transparent",
                      borderRadius: 1,
                      pl: 1.5,
                      pr: 1.5,
                    }}
                  />
                ))}
              </RadioGroup>
            </FormControl>

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleContinue}
                disabled={!methodId}
              >
                {t("payment.continue")}
              </Button>
              <Button
                component={Link}
                to={shippingHref}
                variant="outlined"
                color="secondary"
              >
                {t("payment.backToShipping")}
              </Button>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default PaymentPage;
