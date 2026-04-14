import { useState } from "react";
import type { MouseEvent } from "react";
import {
  Link,
  useLoaderData,
  useRevalidator,
  type LoaderFunctionArgs,
} from "react-router";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import CloseIcon from "@mui/icons-material/Close";
import { getAuthHeader } from "../../../utils/auth";
import { useSearch } from "../../context/SearchContext";
import { useCurrency } from "../../context/CurrencyContext";
import { formatMoneyIso } from "../../utils/money";
import {
  currentLocaleLoginHref,
  getLocaleFromRequest,
  withLocalePath,
} from "../../i18n/locales";
import { graphqlFetchHeaders } from "../../lib/graphqlHeaders";
import { graphqlHttpPost } from "../../lib/graphqlClient";
import { useLocale } from "../../hooks/useLocalizedPath";
import { useTranslation } from "react-i18next";

const ORDERS_QUERY = `
  query {
    orders {
      id
      createdAt
      totalPrice
      isPaid
      paidAt
      isDelivered
      deliveredAt
      user {
        name
      }
    }
  }
`;

const DELETE_ORDER_MUTATION = `
  mutation DeleteOrder($id: ID!) {
    deleteOrder(id: $id)
  }
`;

type Order = {
  id: string;
  createdAt: string;
  totalPrice: number;
  isPaid: boolean;
  paidAt?: string | null;
  isDelivered: boolean;
  deliveredAt?: string | null;
  user: { name: string };
};

function formatDateTime(value: string): string {
  // Requirement: date + "." + time (hh:mm:ss)
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
  // Display: "...abc123" (ellipsis + last 6 chars)
  const tail = id.slice(-6);
  return `...${tail}`;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const lng = getLocaleFromRequest(request);
  const response = await graphqlHttpPost({
    query: ORDERS_QUERY,
    headers: graphqlFetchHeaders(lng, getAuthHeader()),
  });
  if (!response.ok) {
    throw new Response(await response.text(), { status: response.status });
  }
  const json = await response.json();
  if (json.errors) {
    throw new Response(JSON.stringify(json.errors), { status: 400 });
  }
  return json.data.orders as Order[];
}

const OrdersListPage = () => {
  const locale = useLocale();
  const { t } = useTranslation();
  const orders = useLoaderData() as Order[];
  const revalidator = useRevalidator();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { query } = useSearch();
  const { currency } = useCurrency();

  const normalizedQuery = query.trim().toLowerCase();
  let filteredOrders: Order[];

  if (normalizedQuery.length === 0) {
    filteredOrders = orders;
  } else {
    const prefixMatches = orders.filter((order) =>
      order.user.name.toLowerCase().startsWith(normalizedQuery)
    );

    const baseList =
      prefixMatches.length > 0
        ? prefixMatches
        : orders.filter((order) =>
            order.user.name.toLowerCase().includes(normalizedQuery)
          );

    // filteredOrders = baseList.slice(0, 1);
    filteredOrders = baseList;
  }

  const showNoResults =
    normalizedQuery.length > 0 && filteredOrders.length === 0;

  const handleDeleteClick = (
    id: string,
    event?: MouseEvent<HTMLButtonElement>
  ) => {
    // Ensure the triggering button doesn't retain focus when the dialog opens,
    // to avoid aria-hidden conflicts on its ancestors.
    event?.currentTarget.blur();
    setDeleteId(id);
  };
  const handleDeleteClose = () => setDeleteId(null);

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    const auth = getAuthHeader();
    if (!auth) {
      window.location.href = currentLocaleLoginHref();
      return;
    }
    const headers = graphqlFetchHeaders(locale, auth);
    const response = await graphqlHttpPost({
      query: DELETE_ORDER_MUTATION,
      variables: { id: deleteId },
      headers,
    });
    const json = await response.json();
    if (json.errors) {
      const message = json.errors[0]?.message ?? "Delete failed";
      if (message === "Unauthorized" || message === "Forbidden") {
        window.location.href = currentLocaleLoginHref();
        return;
      }
      console.error(json.errors);
    } else if (json.data?.deleteOrder) {
      revalidator.revalidate();
    }
    setDeleteId(null);
  };

  return (
    <Box sx={{ px: 2, py: 2 }}>
      <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
        {t("admin.ordersTitle")}
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="right">{t("admin.colId")}</TableCell>
              <TableCell align="center">{t("admin.buyer")}</TableCell>
              <TableCell align="center">{t("admin.date")}</TableCell>
              <TableCell align="center">{t("admin.total")}</TableCell>
              <TableCell align="center">{t("admin.paid")}</TableCell>
              <TableCell align="center">{t("admin.delivered")}</TableCell>
              <TableCell align="right" sx={{ pr: 8 }}>
                {t("admin.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {showNoResults ? (
              <TableRow>
                <TableCell colSpan={7}>{t("admin.noSearchResults")}</TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell align="right">{formatOrderId(order.id)}</TableCell>
                  <TableCell align="center">{order.user.name}</TableCell>
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
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 1,
                        justifyContent: "flex-end",
                      }}
                    >
                      <Button
                        component={Link}
                        to={withLocalePath(locale, `/order/${order.id}`)}
                        variant="outlined"
                        color="secondary"
                        size="small"
                      >
                        {t("admin.view")}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={(event) => handleDeleteClick(order.id, event)}
                      >
                        {t("admin.delete")}
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={deleteId !== null} onClose={handleDeleteClose}>
        <DialogTitle>{t("admin.deleteOrder")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t("admin.deleteOrderConfirm")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>{t("admin.cancel")}</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            {t("admin.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrdersListPage;
