import { Link, Navigate, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { useAppSelector } from "../store/hooks";
import { selectCartOrderTotals } from "../store/cartSelectors";
import type { CartItem } from "../store/cartSlice";
import { useEffect, useMemo, useState, type SubmitEvent } from "react";
import CardContent from "@mui/material/CardContent";
import Card from "@mui/material/Card";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Avatar from "@mui/material/Avatar";
import Grid from "@mui/material/Grid2";
import OrderSummary from "../components/OrderSummary";
import CheckoutStepper from "../components/CheckoutStepper";
import { resolveImageUrl } from "../utils/imageUrl";
import { getAuthHeader } from "../../utils/auth";
import { useCurrency } from "../context/CurrencyContext";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { formatMoneyIso } from "../utils/money";
import { useLocale, useLocalizedHref } from "../hooks/useLocalizedPath";
import { withLocalePath } from "../i18n/locales";
import { graphqlFetchHeaders } from "../lib/graphqlHeaders";
import { graphqlHttpPost } from "../lib/graphqlClient";
import { useTranslation } from "react-i18next";

const lineTotal = (item: CartItem): number => (item.price ?? 0) * item.quantity;

const PLACE_ORDER_MUTATION = `
  mutation PlaceOrder($input: PlaceOrderInput!) {
    placeOrder(input: $input) {
      id
    }
  }
`;

const CREATE_STRIPE_PAYMENT_INTENT_MUTATION = `
  mutation CreateStripePaymentIntent($input: CreateStripePaymentIntentInput!) {
    createStripePaymentIntent(input: $input) {
      clientSecret
      paymentIntentId
    }
  }
`;

const CREATE_PAYPAL_ORDER_MUTATION = `
  mutation CreatePayPalOrder($input: CreateStripePaymentIntentInput!) {
    createPayPalOrder(input: $input) {
      orderId
    }
  }
`;

type StripePaymentIntentPayload = {
  clientSecret: string;
  paymentIntentId: string;
};

type PayPalOrderPayload = {
  orderId: string;
};

type StripePromise = ReturnType<typeof loadStripe>;

function StripePaymentSection({
  stripePromise,
  clientSecret,
  elementsKey,
  placingOrder,
  onPaid,
}: {
  stripePromise: StripePromise;
  clientSecret: string;
  elementsKey: string;
  placingOrder: boolean;
  onPaid: (paymentIntentId: string) => Promise<void>;
}) {
  const options = useMemo(() => ({ clientSecret }), [clientSecret]);

  return (
    <Elements key={elementsKey} stripe={stripePromise} options={options}>
      <StripePaymentForm disabled={placingOrder} onPaid={onPaid} />
    </Elements>
  );
}

function StripePaymentForm({
  onPaid,
  disabled,
}: {
  onPaid: (paymentIntentId: string) => Promise<void>;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setError(null);
    if (!stripe || !elements) {
      setError(t("checkoutPage.stripeNotReady"));
      return;
    }
    setSubmitting(true);
    try {
      const result = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (result.error) {
        setError(result.error.message ?? t("checkoutPage.paymentFailed"));
        return;
      }

      const paymentIntentId = result.paymentIntent?.id;
      const status = result.paymentIntent?.status;
      if (!paymentIntentId) {
        setError(t("checkoutPage.paymentIntentMissing"));
        return;
      }
      if (status !== "succeeded") {
        setError(t("checkoutPage.paymentNotComplete"));
        return;
      }

      await onPaid(paymentIntentId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("checkoutPage.paymentFailed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
    >
      <PaymentElement />
      {error ? (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      ) : null}
      <Button
        type="submit"
        variant="contained"
        color="secondary"
        disabled={disabled || submitting || !stripe || !elements}
      >
        {t("checkoutPage.pay")}
      </Button>
    </Box>
  );
}

const CheckoutPage = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const locale = useLocale();
  const cartHref = useLocalizedHref("/cart");
  const shippingHref = useLocalizedHref("/shipping");
  const paymentHref = useLocalizedHref("/payment");
  const loginHref = useLocalizedHref("/login");
  const { currency } = useCurrency();
  const items = useAppSelector((state) => state.cart.items);
  const shippingAddress = useAppSelector((state) => state.cart.shippingAddress);
  const selectedPaymentMethod = useAppSelector(
    (state) => state.cart.selectedPaymentMethod
  );
  const { itemsQuantity, itemsPrice, shippingPrice, totalPrice } =
    useAppSelector(selectCartOrderTotals);

  const isEmpty = items.length === 0;

  const cartLineKey = useMemo(
    () =>
      [...items]
        .map((i) => `${i.productId}:${i.quantity}:${i.price ?? 0}`)
        .sort()
        .join("|"),
    [items]
  );

  if (isEmpty) {
    return <Navigate to={cartHref} replace />;
  }
  if (!shippingAddress) {
    return <Navigate to={shippingHref} replace />;
  }
  if (!selectedPaymentMethod) {
    return <Navigate to={paymentHref} replace />;
  }

  const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as
    | string
    | undefined;
  const payPalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID as
    | string
    | undefined;

  const stripePromise = useMemo(() => {
    if (!stripePublishableKey) return null;
    return loadStripe(stripePublishableKey);
  }, [stripePublishableKey]);

  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(
    null
  );
  const [creatingPaymentIntent, setCreatingPaymentIntent] =
    useState<boolean>(false);
  const [paypalOrderId, setPayPalOrderId] = useState<string | null>(null);
  const [creatingPayPalOrder, setCreatingPayPalOrder] = useState<boolean>(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);

  const [placingOrder, setPlacingOrder] = useState<boolean>(false);

  useEffect(() => {
    if (selectedPaymentMethod !== "stripe") {
      setStripeClientSecret(null);
      return;
    }
    if (!stripePromise) return;

    const auth = getAuthHeader();
    if (!auth) {
      navigate(loginHref);
      return;
    }
    const headers = graphqlFetchHeaders(locale, auth);

    let cancelled = false;

    setStripeClientSecret(null);
    setCreatingPaymentIntent(true);

    const input = {
      items: items.map((item) => ({
        productId: item.productId,
        title: item.title ?? t("checkoutPage.productFallback"),
        quantity: item.quantity,
        price: item.price ?? 0,
      })),
      itemsQuantity,
      itemsPrice,
      shippingPrice,
      totalPrice,
    };

    void (async () => {
      try {
        const response = await graphqlHttpPost({
          query: CREATE_STRIPE_PAYMENT_INTENT_MUTATION,
          variables: { input },
          headers,
        });

        const json = (await response.json()) as {
          data?: { createStripePaymentIntent?: StripePaymentIntentPayload };
          errors?: { message?: string }[];
        };

        if (cancelled) return;

        if (
          !response.ok ||
          json.errors ||
          !json.data?.createStripePaymentIntent
        ) {
          console.error("Failed to create Stripe payment intent", json.errors);
          setStripeClientSecret(null);
          return;
        }

        const payload = json.data.createStripePaymentIntent;
        setStripeClientSecret(payload.clientSecret);
      } catch (err) {
        console.error("Failed to create Stripe payment intent", err);
        if (!cancelled) setStripeClientSecret(null);
      } finally {
        if (!cancelled) setCreatingPaymentIntent(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    cartLineKey,
    locale,
    navigate,
    loginHref,
    selectedPaymentMethod,
    stripePromise,
    t,
    items,
    itemsQuantity,
    itemsPrice,
    shippingPrice,
    totalPrice,
  ]);

  useEffect(() => {
    if (selectedPaymentMethod !== "paypal") {
      setPayPalOrderId(null);
      setCreatingPayPalOrder(false);
      setPaypalError(null);
      return;
    }

    if (!payPalClientId) return;

    const auth = getAuthHeader();
    if (!auth) {
      navigate(loginHref);
      return;
    }
    const headers = graphqlFetchHeaders(locale, auth);

    let cancelled = false;
    setPayPalOrderId(null);
    setCreatingPayPalOrder(true);
    setPaypalError(null);

    const input = {
      items: items.map((item) => ({
        productId: item.productId,
        title: item.title ?? t("checkoutPage.productFallback"),
        quantity: item.quantity,
        price: item.price ?? 0,
      })),
      itemsQuantity,
      itemsPrice,
      shippingPrice,
      totalPrice,
    };

    void (async () => {
      try {
        const response = await graphqlHttpPost({
          query: CREATE_PAYPAL_ORDER_MUTATION,
          variables: { input },
          headers,
        });

        const json = (await response.json()) as {
          data?: { createPayPalOrder?: PayPalOrderPayload };
          errors?: { message?: string }[];
        };

        if (cancelled) return;

        if (!response.ok || json.errors || !json.data?.createPayPalOrder?.orderId) {
          setPaypalError(t("checkoutPage.paypalOrderCreateFailed"));
          return;
        }

        setPayPalOrderId(json.data.createPayPalOrder.orderId);
      } catch (err) {
        console.error("Failed to create PayPal order", err);
        if (!cancelled) {
          setPaypalError(t("checkoutPage.paypalOrderCreateFailed"));
        }
      } finally {
        if (!cancelled) {
          setCreatingPayPalOrder(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    cartLineKey,
    items,
    itemsPrice,
    itemsQuantity,
    locale,
    loginHref,
    navigate,
    payPalClientId,
    selectedPaymentMethod,
    shippingPrice,
    t,
    totalPrice,
  ]);

  const placeOrder = async ({
    paymentIntentId,
    paypalOrderId,
  }: {
    paymentIntentId?: string;
    paypalOrderId?: string;
  } = {}) => {
    const auth = getAuthHeader();
    if (!auth) {
      navigate(loginHref);
      return;
    }
    const headers = graphqlFetchHeaders(locale, auth);

    const input = {
      items: items.map((item) => ({
        productId: item.productId,
        title: item.title ?? t("checkoutPage.productFallback"),
        quantity: item.quantity,
        price: item.price ?? 0,
      })),
      itemsQuantity,
      itemsPrice,
      shippingPrice,
      totalPrice,
      shippingAddress: {
        name: shippingAddress.name,
        addressLine1: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2 ?? "",
        postalCode: shippingAddress.postalCode,
        city: shippingAddress.city,
        country: shippingAddress.country,
      },
      paymentMethod: selectedPaymentMethod,
      stripePaymentIntentId:
        selectedPaymentMethod === "stripe" ? (paymentIntentId ?? null) : null,
      paypalOrderId:
        selectedPaymentMethod === "paypal" ? (paypalOrderId ?? null) : null,
    };

    try {
      const response = await graphqlHttpPost({
        query: PLACE_ORDER_MUTATION,
        variables: { input },
        headers,
      });

      const json = (await response.json()) as {
        data?: { placeOrder?: { id: string } };
        errors?: { message?: string }[];
      };

      if (!response.ok || json.errors || !json.data?.placeOrder?.id) {
        console.error("Failed to place order", json.errors);
        return;
      }

      const orderId = json.data.placeOrder.id;

      navigate(withLocalePath(locale, `/order/${orderId}`), {
        state: { clearCart: true },
      });
    } catch (err) {
      console.error("Failed to place order", err);
    }
  };

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
          {t("checkoutPage.title")}
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    {t("checkoutPage.orderItems")}
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t("checkoutPage.tableItem")}</TableCell>
                        <TableCell align="right">
                          {t("checkoutPage.tableQty")}
                        </TableCell>
                        <TableCell align="right">
                          {t("checkoutPage.tablePrice")}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((item) => (
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
                                  resolveImageUrl(item.imageUrl) ?? undefined
                                }
                                alt={item.title ?? item.imageUrl ?? ""}
                                sx={{ width: 50, height: 50 }}
                              />
                              <Typography variant="body2">
                                {item.title ??
                                  t("checkoutPage.productFallback")}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">
                            {formatMoneyIso(lineTotal(item), currency)}
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
                    {t("checkoutPage.shipping")}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 2,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {shippingAddress.name},
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {shippingAddress.addressLine1}{" "}
                      {shippingAddress.addressLine2}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      {shippingAddress.postalCode} {shippingAddress.city},{" "}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {shippingAddress.country}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => {
                      navigate(shippingHref);
                    }}
                    sx={{ mt: 2 }}
                  >
                    {t("checkoutPage.editShipping")}
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    {t("checkoutPage.payment")}
                  </Typography>
                  {selectedPaymentMethod !== "stripe" ? (
                    selectedPaymentMethod !== "paypal" ? (
                      <Typography variant="body2" color="text.secondary">
                        {t(`payment.${selectedPaymentMethod}`, {
                          defaultValue: selectedPaymentMethod,
                        })}
                      </Typography>
                    ) : (
                      <Box
                        sx={{
                          mt: 1,
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        {payPalClientId ? null : (
                          <Typography color="error" variant="body2">
                            {t("checkoutPage.paypalKeyMissing")}
                          </Typography>
                        )}
                        {creatingPayPalOrder ? (
                          <Typography color="text.secondary" variant="body2">
                            {t("checkoutPage.preparingPayPal")}
                          </Typography>
                        ) : null}
                        {paypalError ? (
                          <Typography color="error" variant="body2">
                            {paypalError}
                          </Typography>
                        ) : null}
                        {payPalClientId ? (
                          <PayPalScriptProvider
                            options={{
                              clientId: payPalClientId,
                              currency: currency.toUpperCase(),
                              intent: "capture",
                            }}
                          >
                            <PayPalButtons
                              disabled={
                                placingOrder ||
                                creatingPayPalOrder ||
                                !paypalOrderId
                              }
                              createOrder={async () => {
                                if (!paypalOrderId) {
                                  setPaypalError(
                                    t("checkoutPage.paypalOrderCreateFailed")
                                  );
                                  throw new Error(
                                    t("checkoutPage.paypalOrderCreateFailed")
                                  );
                                }
                                return paypalOrderId;
                              }}
                              onApprove={async (data) => {
                                const approvedOrderId =
                                  data.orderID ?? paypalOrderId;
                                if (!approvedOrderId) {
                                  setPaypalError(
                                    t("checkoutPage.paypalApprovalMissing")
                                  );
                                  return;
                                }
                                setPayPalOrderId(approvedOrderId);
                                setPaypalError(null);
                                setPlacingOrder(true);
                                try {
                                  await placeOrder({
                                    paypalOrderId: approvedOrderId,
                                  });
                                } finally {
                                  setPlacingOrder(false);
                                }
                              }}
                              onError={(err) => {
                                console.error("PayPal button error", err);
                                setPaypalError(t("checkoutPage.paymentFailed"));
                              }}
                            />
                          </PayPalScriptProvider>
                        ) : null}
                      </Box>
                    )
                  ) : (
                    <Box
                      sx={{
                        mt: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      {stripePublishableKey ? null : (
                        <Typography color="error" variant="body2">
                          {t("checkoutPage.stripeKeyMissing")}
                        </Typography>
                      )}
                      {creatingPaymentIntent ? (
                        <Typography color="text.secondary" variant="body2">
                          {t("checkoutPage.preparingPayment")}
                        </Typography>
                      ) : null}
                      {stripeClientSecret && stripePromise ? (
                        <StripePaymentSection
                          stripePromise={stripePromise}
                          clientSecret={stripeClientSecret}
                          elementsKey={`${cartLineKey}:${stripeClientSecret}`}
                          placingOrder={placingOrder}
                          onPaid={async (paymentIntentId) => {
                            setPlacingOrder(true);
                            try {
                              await placeOrder({ paymentIntentId });
                            } finally {
                              setPlacingOrder(false);
                            }
                          }}
                        />
                      ) : null}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <OrderSummary items={itemsPrice} shipping={shippingPrice} />
          </Grid>
        </Grid>
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
            mt: 3,
          }}
        >
          <Button
            component={Link}
            to={paymentHref}
            variant="outlined"
            color="secondary"
          >
            {t("checkoutPage.backToPayment")}
          </Button>
          {selectedPaymentMethod === "stripe" ? (
            <Typography variant="body2" color="text.secondary">
              {t("checkoutPage.completeStripe")}
            </Typography>
          ) : selectedPaymentMethod === "paypal" ? (
            <Typography variant="body2" color="text.secondary">
              {t("checkoutPage.completePayPal")}
            </Typography>
          ) : (
            <Button
              variant="contained"
              color="secondary"
              onClick={() => void placeOrder()}
            >
              {t("checkoutPage.placeOrder")}
            </Button>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default CheckoutPage;
