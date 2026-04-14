import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import SubtotalRow from "./SubtotalRow";
import { useCurrency } from "../context/CurrencyContext";
import { formatMoneyIso } from "../utils/money";
import { useTranslation } from "react-i18next";

type OrderSummaryProps = {
  items: number;
  shipping?: number;
};

const OrderSummary = ({ items, shipping = 0 }: OrderSummaryProps) => {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const total = items + shipping;

  const formatAmount = (amount: number): string => {
    return formatMoneyIso(amount, currency);
  };

  return (
    <Card sx={{ height: "fit-content" }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
          {t("orderSummary.title")}
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          <SubtotalRow
            label={t("orderSummary.items")}
            value={formatAmount(items)}
          />
          <SubtotalRow
            label={t("orderSummary.shipping")}
            value={formatAmount(shipping)}
          />
          <Typography variant="caption" color="text.secondary" sx={{ py: 0.5 }}>
            {t("orderSummary.taxNote")}
          </Typography>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              pt: 1.5,
              mt: 1,
              borderTop: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="subtitle1">
              {t("orderSummary.total")}
            </Typography>
            <Typography variant="subtitle1" fontWeight="bold">
              {formatAmount(total)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default OrderSummary;
