import { useState } from "react";
import type { MouseEvent } from "react";
import {
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
import { getAuthHeader } from "../../../utils/auth";
import { useSearch } from "../../context/SearchContext";
import { currentLocaleLoginHref, getLocaleFromRequest } from "../../i18n/locales";
import { graphqlFetchHeaders } from "../../lib/graphqlHeaders";
import { graphqlHttpPost } from "../../lib/graphqlClient";
import { useTranslation } from "react-i18next";
import { useLocale } from "../../hooks/useLocalizedPath";

const REVIEWS_QUERY = `
  query {
    reviews {
      id
      createdAt
      rating
      comment
      user {
        name
      }
      product {
        title
      }
    }
  }
`;

const DELETE_REVIEW_MUTATION = `
  mutation DeleteReview($id: ID!) {
    deleteReview(id: $id)
  }
`;

type Review = {
  id: string;
  createdAt: string;
  rating: number;
  comment: string;
  user: { name: string };
  product: { title: string };
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-CA");
}

function truncateComment(comment: string, maxLen: number = 40): string {
  if (comment.length <= maxLen) return comment;
  return comment.slice(0, maxLen) + "…";
}

export async function loader({ request }: LoaderFunctionArgs) {
  const lng = getLocaleFromRequest(request);
  const response = await graphqlHttpPost({
    query: REVIEWS_QUERY,
    headers: graphqlFetchHeaders(lng, getAuthHeader()),
  });
  if (!response.ok) {
    throw new Response(await response.text(), { status: response.status });
  }
  const json = await response.json();
  if (json.errors) {
    throw new Response(JSON.stringify(json.errors), { status: 400 });
  }
  return json.data.reviews as Review[];
}

const ReviewsListPage = () => {
  const locale = useLocale();
  const { t } = useTranslation();
  const reviews = useLoaderData() as Review[];
  const revalidator = useRevalidator();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { query } = useSearch();

  const normalizedQuery = query.trim().toLowerCase();
  let filteredReviews: Review[];

  if (normalizedQuery.length === 0) {
    filteredReviews = reviews;
  } else {
    const productPrefixMatches = reviews.filter((review) =>
      review.product.title.toLowerCase().startsWith(normalizedQuery)
    );

    const authorPrefixMatches =
      productPrefixMatches.length === 0
        ? reviews.filter((review) =>
            review.user.name.toLowerCase().startsWith(normalizedQuery)
          )
        : [];

    const baseList =
      productPrefixMatches.length > 0
        ? productPrefixMatches
        : authorPrefixMatches.length > 0
          ? authorPrefixMatches
          : reviews.filter((review) => {
              const productTitle = review.product.title.toLowerCase();
              const authorName = review.user.name.toLowerCase();
              return (
                productTitle.includes(normalizedQuery) ||
                authorName.includes(normalizedQuery)
              );
            });

    // filteredReviews = baseList.slice(0, 1);
    filteredReviews = baseList;
  }

  const showNoResults =
    normalizedQuery.length > 0 && filteredReviews.length === 0;

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
      query: DELETE_REVIEW_MUTATION,
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
    } else if (json.data?.deleteReview) {
      revalidator.revalidate();
    }
    setDeleteId(null);
  };

  return (
    <Box sx={{ px: 2, py: 2 }}>
      <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
        {t("admin.reviewsTitle")}
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t("admin.colAuthor")}</TableCell>
              <TableCell>{t("admin.colProduct")}</TableCell>
              <TableCell align="center">{t("admin.colRating")}</TableCell>
              <TableCell>{t("admin.colComment")}</TableCell>
              <TableCell align="center">{t("admin.date")}</TableCell>
              <TableCell align="right" sx={{ pr: 4 }}>
                {t("admin.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {showNoResults ? (
              <TableRow>
                <TableCell colSpan={6}>{t("admin.noSearchResults")}</TableCell>
              </TableRow>
            ) : (
              filteredReviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell>{review.user.name}</TableCell>
                  <TableCell>{review.product.title}</TableCell>
                  <TableCell align="center">{review.rating}</TableCell>
                  <TableCell sx={{ maxWidth: 200 }} title={review.comment}>
                    {truncateComment(review.comment)}
                  </TableCell>
                  <TableCell align="center">
                    {formatDate(review.createdAt)}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={(event) => handleDeleteClick(review.id, event)}
                    >
                      {t("admin.delete")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={deleteId !== null} onClose={handleDeleteClose}>
        <DialogTitle>{t("admin.deleteReview")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("admin.deleteReviewConfirm")}
          </DialogContentText>
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

export default ReviewsListPage;
