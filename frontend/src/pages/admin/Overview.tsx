import { useLoaderData, redirect, type LoaderFunctionArgs } from "react-router";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid2";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import GroupIcon from "@mui/icons-material/Group";
import StarIcon from "@mui/icons-material/Star";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { logout } from "../../store/authSlice";
import { store } from "../../store/store";
import { useCurrency } from "../../context/CurrencyContext";
import { formatMoneyIso } from "../../utils/money";
import { getLocaleFromRequest, localizedLoginPath } from "../../i18n/locales";
import { graphqlFetchHeaders } from "../../lib/graphqlHeaders";
import { graphqlHttpPost } from "../../lib/graphqlClient";
import { getAuthHeader } from "../../../utils/auth";
import { useTranslation } from "react-i18next";

type OverviewOrderUser = {
  name: string;
};

type OverviewOrder = {
  id: string;
  createdAt: string;
  totalPrice: number;
  user: OverviewOrderUser;
};

type OverviewSalesPoint = {
  date: string;
  total: number;
};

type OverviewData = {
  productsCount: number;
  usersCount: number;
  ordersCount: number;
  reviewsCount: number;
  totalSales: number;
  salesByDate: OverviewSalesPoint[];
  recentOrders: OverviewOrder[];
};

const OVERVIEW_QUERY = `
  query AdminOverview {
    adminOverview {
      productsCount
      usersCount
      ordersCount
      reviewsCount
      totalSales
      salesByDate {
        date
        total
      }
      recentOrders {
        id
        createdAt
        totalPrice
        user {
          name
        }
      }
    }
  }
`;

type OverviewLoaderResult = OverviewData;

function formatCurrency(value: number, currency: string): string {
  return formatMoneyIso(value, currency);
}

function formatIntegerCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString("en-CA");
}

export async function loader({ request }: LoaderFunctionArgs) {
  const lng = getLocaleFromRequest(request);
  const auth = getAuthHeader();
  if (!auth) {
    store.dispatch(logout());
    return redirect(localizedLoginPath(request));
  }

  const response = await graphqlHttpPost({
    query: OVERVIEW_QUERY,
    headers: graphqlFetchHeaders(lng, auth),
  });

  if (!response.ok) {
    throw new Response(await response.text(), { status: response.status });
  }

  const json = await response.json();

  if (json.errors) {
    const message = json.errors[0]?.message ?? "Overview load failed";
    const lower = message.toLowerCase();
    if (
      lower === "unauthorized" ||
      lower === "forbidden" ||
      lower.includes("brak autoryzacji") ||
      lower.includes("brak uprawnień")
    ) {
      store.dispatch(logout());
      return redirect(localizedLoginPath(request));
    }
    throw new Response(JSON.stringify(json.errors), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const data = json.data?.adminOverview;
  if (!data) {
    throw new Response("Invalid overview response", { status: 500 });
  }

  return data as OverviewLoaderResult;
}

const OverviewPage = () => {
  const { t } = useTranslation();
  const overview = useLoaderData() as OverviewLoaderResult;
  const { currency } = useCurrency();

  const {
    productsCount,
    usersCount,
    ordersCount,
    reviewsCount,
    totalSales,
    salesByDate,
    recentOrders,
  } = overview;

  const chartData = salesByDate.map((point) => ({
    createdAt: point.date,
    total: point.total,
  }));

  return (
    <Box sx={{ px: 2, py: 2 }}>
      <Typography variant="h5" component="h1" sx={{ mb: 3 }}>
        {t("admin.overviewTitle")}
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <Card>
            <CardContent
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  {t("admin.revenues")}
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(totalSales, currency)}
                </Typography>
              </Box>
              <AttachMoneyIcon color="secondary" />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <Card>
            <CardContent
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  {t("admin.products")}
                </Typography>
                <Typography variant="h6">{productsCount}</Typography>
              </Box>
              <Inventory2Icon color="secondary" />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <Card>
            <CardContent
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  {t("admin.orders")}
                </Typography>
                <Typography variant="h6">{ordersCount}</Typography>
              </Box>
              <ShoppingCartIcon color="secondary" />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <Card>
            <CardContent
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  {t("admin.customers")}
                </Typography>
                <Typography variant="h6">{usersCount}</Typography>
              </Box>
              <GroupIcon color="secondary" />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <Card>
            <CardContent
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  {t("admin.reviews")}
                </Typography>
                <Typography variant="h6">{reviewsCount}</Typography>
              </Box>
              <StarIcon color="secondary" />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                {t("admin.salesValue")}
              </Typography>
              <Box
                sx={{
                  width: "100%",
                  height: 300,
                  minHeight: 300,
                  minWidth: 0,
                  pt: 2,
                }}
              >
                {chartData.length === 0 ? (
                  <Typography color="text.secondary">
                    {t("admin.noSalesData")}
                  </Typography>
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height={280}
                    minHeight={280}
                  >
                    <BarChart
                      data={chartData}
                      margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="createdAt"
                        tickLine={false}
                        tickMargin={8}
                        axisLine={false}
                        tickFormatter={(value: string) => value.slice(5, 10)}
                      />
                      <YAxis
                        tickLine={false}
                        tickMargin={8}
                        axisLine={false}
                        tickFormatter={(value: number) =>
                          formatIntegerCurrency(value)
                        }
                      />
                      <Bar
                        dataKey="total"
                        fill="#1976d2"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                {t("admin.recentOrders")}
              </Typography>
              {recentOrders.length === 0 ? (
                <Typography color="text.secondary">
                  {t("admin.emptyRecentOrders")}
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t("admin.buyer")}</TableCell>
                      <TableCell>{t("admin.date")}</TableCell>
                      <TableCell align="right">{t("admin.total")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>{order.user.name}</TableCell>
                        <TableCell>{formatDate(order.createdAt)}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(order.totalPrice, currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OverviewPage;
