import { Link, useLoaderData, type LoaderFunctionArgs } from "react-router";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Button from "@mui/material/Button";
import CloseIcon from "@mui/icons-material/Close";
import { getAuthHeader } from "../../utils/auth";
import { useCurrency } from "../context/CurrencyContext";
import { formatMoneyIso } from "../utils/money";
import { getLocaleFromRequest, withLocalePath } from "../i18n/locales";
import { graphqlFetchHeaders } from "../lib/graphqlHeaders";
import { graphqlHttpPost } from "../lib/graphqlClient";
import { useLocale } from "../hooks/useLocalizedPath";
import { useTranslation } from "react-i18next";

const MY_ORDERS_QUERY = `
  query {
    myOrders {
      id
      createdAt
      totalPrice
      isPaid
      paidAt
      isDelivered
      deliveredAt
    }
  }
`;

type OrderRow = {
  id: string;
  createdAt: string;
  totalPrice: number;
  isPaid: boolean;
  paidAt?: string | null;
  isDelivered: boolean;
  deliveredAt?: string | null;
};

function formatDateTime(value: string): string {
  const d = new Date(value);
  const date = d.toLocaleDateString("en-CA");
  const time = d.toLocaleTimeString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${date}.${time}`;
}

function formatOrderId(id: string): string {
  const tail = id.slice(-6);
  return `...${tail}`;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const lng = getLocaleFromRequest(request);
  const response = await graphqlHttpPost({
    query: MY_ORDERS_QUERY,
    headers: graphqlFetchHeaders(lng, getAuthHeader()),
  });
  if (!response.ok) {
    throw new Response(await response.text(), { status: response.status });
  }
  const json = await response.json();
  if (json.errors) {
    throw new Response(JSON.stringify(json.errors), { status: 400 });
  }
  return json.data.myOrders as OrderRow[];
}

const MyOrdersPage = () => {
  const { t } = useTranslation();
  const orders = useLoaderData() as OrderRow[];
  const { currency } = useCurrency();
  const locale = useLocale();

  return (
    <Box sx={{ px: 2, py: 2 }}>
      <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
        {t("account.myOrdersTitle")}
      </Typography>
      {orders.length === 0 ? (
        <Typography color="text.secondary">{t("account.emptyOrders")}</Typography>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="right">{t("admin.colId")}</TableCell>
                <TableCell align="center">{t("admin.date")}</TableCell>
                <TableCell align="center">{t("admin.total")}</TableCell>
                <TableCell align="center">{t("admin.paid")}</TableCell>
                <TableCell align="center">{t("admin.delivered")}</TableCell>
                <TableCell align="right">{t("admin.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell align="right">{formatOrderId(order.id)}</TableCell>
                  <TableCell align="center">
                    {formatDateTime(order.createdAt)}
                  </TableCell>
                  <TableCell align="center">
                    {formatMoneyIso(order.totalPrice, currency)}
                  </TableCell>
                  <TableCell align="center">
                    {order.isPaid ? (
                      order.paidAt ? (
                        formatDateTime(order.paidAt)
                      ) : (
                        t("order.paid")
                      )
                    ) : (
                      <CloseIcon
                        sx={{ color: "error.main", fontSize: 18 }}
                        aria-label={t("order.unpaid")}
                      />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {order.isDelivered ? (
                      order.deliveredAt ? (
                        formatDateTime(order.deliveredAt)
                      ) : (
                        t("order.delivered")
                      )
                    ) : (
                      <CloseIcon
                        sx={{ color: "error.main", fontSize: 18 }}
                        aria-label={t("order.notDelivered")}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      component={Link}
                      to={withLocalePath(locale, `/order/${order.id}`)}
                      variant="outlined"
                      color="secondary"
                      size="small"
                    >
                      {t("admin.view")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default MyOrdersPage;
