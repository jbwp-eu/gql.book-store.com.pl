import { Link, useLoaderData, type LoaderFunctionArgs } from "react-router";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { getAuthHeader } from "../../utils/auth";
import { getLocaleFromRequest, withLocalePath } from "../i18n/locales";
import { graphqlFetchHeaders } from "../lib/graphqlHeaders";
import { graphqlHttpPost } from "../lib/graphqlClient";
import { useLocale } from "../hooks/useLocalizedPath";
import { useTranslation } from "react-i18next";

const MY_REVIEWS_QUERY = `
  query {
    myReviews {
      id
      createdAt
      rating
      comment
      product {
        id
        title
      }
    }
  }
`;

type ReviewRow = {
  id: string;
  createdAt: string;
  rating: number;
  comment: string;
  product: { id: string; title: string };
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-CA");
}

function truncateComment(comment: string, maxLen: number = 60): string {
  if (comment.length <= maxLen) return comment;
  return comment.slice(0, maxLen) + "…";
}

export async function loader({ request }: LoaderFunctionArgs) {
  const lng = getLocaleFromRequest(request);
  const response = await graphqlHttpPost({
    query: MY_REVIEWS_QUERY,
    headers: graphqlFetchHeaders(lng, getAuthHeader()),
  });
  if (!response.ok) {
    throw new Response(await response.text(), { status: response.status });
  }
  const json = await response.json();
  if (json.errors) {
    throw new Response(JSON.stringify(json.errors), { status: 400 });
  }
  return json.data.myReviews as ReviewRow[];
}

const MyReviewsPage = () => {
  const { t } = useTranslation();
  const reviews = useLoaderData() as ReviewRow[];
  const locale = useLocale();

  return (
    <Box sx={{ px: 2, py: 2 }}>
      <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
        {t("account.myReviewsTitle")}
      </Typography>
      {reviews.length === 0 ? (
        <Typography color="text.secondary">
          {t("account.emptyReviews")}
        </Typography>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t("admin.colProduct")}</TableCell>
                <TableCell align="center">{t("admin.colRating")}</TableCell>
                <TableCell>{t("admin.colComment")}</TableCell>
                <TableCell align="center">{t("admin.date")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell>
                    <Typography
                      component={Link}
                      to={withLocalePath(locale, `/product/${review.product.id}`)}
                      sx={{ color: "secondary.main", textDecoration: "none" }}
                    >
                      {review.product.title}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{review.rating}</TableCell>
                  <TableCell sx={{ maxWidth: 280 }} title={review.comment}>
                    {truncateComment(review.comment)}
                  </TableCell>
                  <TableCell align="center">
                    {formatDate(review.createdAt)}
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

export default MyReviewsPage;
