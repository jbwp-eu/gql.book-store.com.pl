import Box from "@mui/material/Box";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useLocation } from "react-router";
import { stripLocalePrefix } from "../i18n/locales";
import { useAppSelector } from "../store/hooks";
import { useTranslation } from "react-i18next";

const stepIds = ["cart", "shipping", "payment", "review"] as const;

/** Explicit hexes: theme `primary.main` is ~white, so MUI StepIcon completed/active would be invisible. */
const STEP_DONE = "#43a047";
const STEP_ACTIVE = "#0288d1";
const STEP_PENDING = "#cfd8dc";

const CheckoutStepper = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  const items = useAppSelector((state) => state.cart.items);
  const shippingAddress = useAppSelector((state) => state.cart.shippingAddress);
  const selectedPaymentMethod = useAppSelector(
    (state) => state.cart.selectedPaymentMethod
  );

  const pathname = stripLocalePrefix(location.pathname);

  const activeStep = pathname.startsWith("/checkout")
    ? 3
    : pathname.startsWith("/payment")
      ? 2
      : pathname.startsWith("/shipping")
        ? 1
        : 0;

  const cartCompleted = items.length > 0;
  const shippingCompleted = !!shippingAddress;
  const paymentCompleted = !!selectedPaymentMethod;

  const isStepCompleted = (index: number) => {
    if (index === 0) return cartCompleted;
    if (index === 1) return shippingCompleted;
    if (index === 2) return paymentCompleted;
    return false;
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Stepper
        activeStep={activeStep}
        orientation={isSmall ? "vertical" : "horizontal"}
        alternativeLabel={!isSmall}
      >
        {stepIds.map((stepId, index) => {
          const completed = isStepCompleted(index);
          const isActive = index === activeStep;
          const iconBase = completed
            ? STEP_DONE
            : isActive
              ? STEP_ACTIVE
              : STEP_PENDING;
          return (
            <Step
              key={stepId}
              completed={completed}
              sx={{
                "& .MuiStepIcon-root": { color: iconBase },
                /* Default StepIcon uses primary.main for .Mui-completed / .Mui-active; theme primary is ~white. */
                "& .MuiStepIcon-root.Mui-completed": { color: STEP_DONE },
                "& .MuiStepIcon-root.Mui-active": {
                  color: completed ? STEP_DONE : STEP_ACTIVE,
                },
                "& .MuiStepLabel-label": {
                  color: iconBase,
                  fontWeight: completed || isActive ? "bold" : "normal",
                },
                "& .MuiStepLabel-root.Mui-completed .MuiStepLabel-label": {
                  color: STEP_DONE,
                },
                "& .MuiStepLabel-root.Mui-active .MuiStepLabel-label": {
                  color: completed ? STEP_DONE : STEP_ACTIVE,
                },
              }}
            >
              <StepLabel>{t(`checkoutSteps.${stepId}`)}</StepLabel>
            </Step>
          );
        })}
      </Stepper>
    </Box>
  );
};

export default CheckoutStepper;
