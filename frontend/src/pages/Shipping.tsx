import { Link, Navigate } from "react-router";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setShippingAddress,
  type CartItem,
  type ShippingAddress,
} from "../store/cartSlice";
import { useEffect, useMemo } from "react";
import CheckoutStepper from "../components/CheckoutStepper";
import { useLocalizedHref } from "../hooks/useLocalizedPath";
import { useCurrency } from "../context/CurrencyContext";
import { formatMoneyIso } from "../utils/money";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const lineTotal = (item: CartItem): number => (item.price ?? 0) * item.quantity;

function getShippingSchema(t: TFunction) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(2, { message: t("shipping.nameHelper") }),
    addressLine1: z
      .string()
      .trim()
      .min(1, { message: t("shipping.validation.required") }),
    addressLine2: z.string(),
    city: z
      .string()
      .trim()
      .min(1, { message: t("shipping.validation.required") }),
    postalCode: z
      .string()
      .trim()
      .min(1, { message: t("shipping.validation.required") }),
    country: z
      .string()
      .trim()
      .min(1, { message: t("shipping.validation.required") }),
    phone: z.string(),
  });
}

type ShippingFormValues = z.infer<ReturnType<typeof getShippingSchema>>;

function addressToDefaults(addr: ShippingAddress | null): ShippingFormValues {
  return {
    name: addr?.name ?? "",
    addressLine1: addr?.addressLine1 ?? "",
    addressLine2: addr?.addressLine2 ?? "",
    city: addr?.city ?? "",
    postalCode: addr?.postalCode ?? "",
    country: addr?.country ?? "Poland",
    phone: addr?.phone ?? "",
  };
}

const ShippingPage = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const cartHref = useLocalizedHref("/cart");
  const paymentHref = useLocalizedHref("/payment");
  const { currency } = useCurrency();
  const items = useAppSelector((state) => state.cart.items);
  const savedAddress = useAppSelector((state) => state.cart.shippingAddress);

  const schema = useMemo(() => getShippingSchema(t), [t]);
  const resolver = useMemo(() => zodResolver(schema), [schema]);
  const defaultValues = useMemo(
    () => addressToDefaults(savedAddress),
    [savedAddress]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShippingFormValues>({
    resolver,
    defaultValues,
  });

  useEffect(() => {
    reset(addressToDefaults(savedAddress));
  }, [savedAddress, reset]);

  const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);
  const isEmpty = items.length === 0;

  const onValid = (values: ShippingFormValues) => {
    dispatch(
      setShippingAddress({
        name: values.name.trim(),
        addressLine1: values.addressLine1.trim(),
        ...(values.addressLine2.trim() && {
          addressLine2: values.addressLine2.trim(),
        }),
        city: values.city.trim(),
        postalCode: values.postalCode.trim(),
        country: values.country.trim(),
        ...(values.phone.trim() && { phone: values.phone.trim() }),
      })
    );
  };

  if (isEmpty) {
    return <Navigate to={cartHref} replace />;
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
          {t("shipping.title")}
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
              sx={{ mb: 1 }}
            >
              {t("shipping.orderSummary", {
                count: items.length,
                amount: formatMoneyIso(subtotal, currency),
              })}
            </Typography>

            <Box
              component="form"
              noValidate
              onSubmit={handleSubmit(onValid)}
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <TextField
                label={t("shipping.fullName")}
                required
                fullWidth
                error={!!errors.name}
                helperText={errors.name?.message}
                {...register("name")}
              />
              <TextField
                label={t("shipping.address1")}
                required
                fullWidth
                error={!!errors.addressLine1}
                helperText={errors.addressLine1?.message}
                {...register("addressLine1")}
              />
              <TextField
                label={t("shipping.address2")}
                fullWidth
                {...register("addressLine2")}
              />
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <TextField
                  label={t("shipping.city")}
                  required
                  error={!!errors.city}
                  helperText={errors.city?.message}
                  sx={{ flex: "1 1 120px", minWidth: 0 }}
                  {...register("city")}
                />
                <TextField
                  label={t("shipping.postalCode")}
                  required
                  error={!!errors.postalCode}
                  helperText={errors.postalCode?.message}
                  sx={{ flex: "1 1 120px", minWidth: 0 }}
                  {...register("postalCode")}
                />
              </Box>
              <TextField
                label={t("shipping.country")}
                required
                fullWidth
                error={!!errors.country}
                helperText={errors.country?.message}
                {...register("country")}
              />
              <TextField
                label={t("shipping.phone")}
                fullWidth
                {...register("phone")}
              />
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                <Button type="submit" variant="contained" color="secondary">
                  {t("shipping.saveAddress")}
                </Button>
                <Button
                  component={Link}
                  to={cartHref}
                  variant="outlined"
                  color="secondary"
                >
                  {t("shipping.backToCart")}
                </Button>
                <Button
                  component={Link}
                  to={paymentHref}
                  variant="outlined"
                  color="secondary"
                  disabled={!savedAddress}
                >
                  {t("shipping.continueToPayment")}
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default ShippingPage;
