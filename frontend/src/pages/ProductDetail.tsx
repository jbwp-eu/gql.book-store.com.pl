import { useEffect, useMemo, useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData, useNavigate } from "react-router";
import type { Product } from "./Home";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid2";
import Typography from "@mui/material/Typography";
import ProductImages from "../components/ProductImages";
import { useTheme } from "@mui/material/styles";
import Button from "@mui/material/Button";
import { addItem, removeItem } from "../store/cartSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import toast from "react-hot-toast";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import { resolveImageUrl } from "../utils/imageUrl";
import { useLocalizedHref } from "../hooks/useLocalizedPath";
import { getLocaleFromRequest } from "../i18n/locales";
import {
  graphqlJsonHeaders,
  localeFromI18nLanguage,
} from "../lib/graphqlHeaders";
import { graphqlHttpPost } from "../lib/graphqlClient";
import { useCurrency } from "../context/CurrencyContext";
import { formatMoneyIso } from "../utils/money";
import ReviewList, { type Review } from "../components/ReviewList";
import Badge from "@mui/material/Badge";
import Rating from "@mui/material/Rating";
import { useTranslation } from "react-i18next";

const PRODUCT_QUERY = `
  query ($id: ID!) {
    product(id: $id) {
      id
      title
      description
      price
      countInStock
      isFeatured
      images
      banners
      averageRating
      reviewCount
    }
  }
`;

const REVIEWS_QUERY = `
  query ProductReviews($productId: ID!) {
    productReviews(productId: $productId) {
      id
      createdAt
      rating
      comment
      user {
        id
        name
      }
      product {
        id
        title
      }
    }
  }
`;

export async function loader({ params, request }: LoaderFunctionArgs) {
  const productId = params.productId;
  if (!productId) {
    throw new Response(null, { status: 404 });
  }
  const lng = getLocaleFromRequest(request);
  const response = await graphqlHttpPost({
    query: PRODUCT_QUERY,
    variables: { id: productId },
    headers: graphqlJsonHeaders(lng),
  });
  if (!response.ok) {
    throw new Response(await response.text(), { status: response.status });
  }
  const json = await response.json();
  if (json.errors) {
    throw new Response(JSON.stringify(json.errors), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const product = json.data?.product ?? null;
  if (!product) {
    throw new Response(null, { status: 404 });
  }
  return product as Product;
}

const ProductDetailPage = () => {
  const { t, i18n } = useTranslation();
  const product = useLoaderData() as Product;
  const userId = useAppSelector((s) => s.auth.userInfo.id);
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const cartHref = useLocalizedHref("/cart");
  const loginHref = useLocalizedHref("/login");
  const productPathForRedirect = useLocalizedHref(`/product/${product.id}`);
  const { currency } = useCurrency();

  const [productReviews, setProductReviews] = useState<Review[]>([]);
  const [reviewsRefreshToken, setReviewsRefreshToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchReviews = async () => {
      const response = await graphqlHttpPost({
        query: REVIEWS_QUERY,
        variables: { productId: product.id },
        headers: graphqlJsonHeaders(localeFromI18nLanguage(i18n.language)),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch reviews: ${response.status}`);
      }

      const json = await response.json();
      if (json.errors) {
        const message = json.errors?.[0]?.message ?? "Failed to fetch reviews";
        throw new Error(message);
      }

      const reviews = (json.data?.productReviews ?? []) as Review[];
      if (isMounted) setProductReviews(reviews);
    };

    // Reset when product changes (route param).
    setProductReviews([]);
    fetchReviews().catch((err) => {
      console.warn("Reviews fetch skipped:", err);
      if (isMounted) setProductReviews([]);
    });

    return () => {
      isMounted = false;
    };
  }, [product.id, reviewsRefreshToken, i18n.language]);

  const reviewsForProduct = useMemo(() => productReviews, [productReviews]);

  const reviewStats = useMemo(() => {
    const list = reviewsForProduct;
    if (list.length === 0) {
      return { average: 0, count: 0 };
    }
    const sum = list.reduce((acc, r) => acc + r.rating, 0);
    return { average: sum / list.length, count: list.length };
  }, [reviewsForProduct]);

  const alreadyReviewed = useMemo(
    () =>
      Boolean(userId) &&
      reviewsForProduct.some((r) => r.user?.id != null && r.user.id === userId),
    [userId, reviewsForProduct]
  );

  const inCart = useAppSelector((state) =>
    state.cart.items.some((item) => item.productId === product.id)
  );
  const handleAddToCart = () => {
    dispatch(
      addItem({
        productId: product.id,
        quantity: 1,
        title: product.title,
        price: product.price,
        countInStock: product.countInStock,
        imageUrl: resolveImageUrl(product.images?.[0] ?? null) ?? undefined,
      })
    );
    toast.success((toastItem) => (
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {product.title} {t("product.addedToCart")}
        <button
          type="button"
          onClick={() => {
            toast.dismiss(toastItem.id);
            navigate(cartHref);
          }}
        >
          {t("product.goToCart")}
        </button>
      </span>
    ));
  };
  const handleRemoveFromCart = () => {
    dispatch(removeItem(product.id));
    toast.success((toastItem) => (
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {product.title} {t("product.removedFromCart")}
        <button
          type="button"
          onClick={() => {
            toast.dismiss(toastItem.id);
            navigate(cartHref);
          }}
        >
          {t("product.goToCart")}
        </button>
      </span>
    ));
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
      }}
    >
      <Grid container spacing={3} direction="row" alignItems="flex-start">
        <Grid size={{ xs: 12, sm: 4, md: 4 }}>
          <ProductImages images={product.images ?? []} title={product.title} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4, md: 4 }}>
          <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
            {product.title}
          </Typography>

          {reviewStats.count > 0 ? (
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                  mb: 2,
                }}
              >
                <Rating
                  value={reviewStats.average}
                  readOnly
                  precision={0.1}
                  size="medium"
                />
                <Typography variant="body1" color="text.secondary">
                  {reviewStats.average.toFixed(1)} {t("product.outOf5")}
                </Typography>
              </Box>
              <Typography
                variant="body1"
                component="span"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {reviewStats.count}{" "}
                {reviewStats.count === 1
                  ? t("product.rating")
                  : t("product.ratings")}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {t("product.noRatingsYet")}
            </Typography>
          )}
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="body1"
              color="text.secondary"
              component="span"
              sx={{ mr: 1 }}
            >
              {t("product.price")}{" "}
            </Typography>
            <Badge
              variant="standard"
              sx={{
                fontWeight: "bold",
                display: "inline-block",
                bgcolor: theme.palette.success.main,
                color: theme.palette.success.contrastText,
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
              }}
            >
              {formatMoneyIso(product.price, currency)}
            </Badge>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="body1"
              color="text.secondary"
              component="div"
              sx={{
                mb: 0.5,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 1,
              }}
            >
              <Box component="span" sx={{ fontWeight: "bold" }}>
                {t("product.description")}{" "}
              </Box>
              <Box component="span" sx={{ fontWeight: "normal" }}>
                {product.description ?? ""}
              </Box>
            </Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 4, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{
                  width: "100%",
                  textAlignLast: "justify",
                  mb: 1,
                }}
              >
                {t("product.price")}{" "}
                <Badge
                  variant="standard"
                  sx={{
                    display: "inline-block",
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1.5,
                    fontWeight: 600,
                    color: "#fff",
                    bgcolor: theme.palette.success.main,
                    border: `1px solid ${theme.palette.success.main}`,
                  }}
                >
                  {formatMoneyIso(product.price, currency)}
                </Badge>
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontWeight: "bold",
                  textAlignLast: "justify",
                  width: "100%",
                }}
              >
                {t("product.status")}{" "}
                <Box
                  component="span"
                  sx={{
                    display: "inline-block",
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1.5,
                    fontWeight: 600,
                    color: "#fff",
                    bgcolor:
                      product.countInStock > 0
                        ? theme.palette.info.main
                        : theme.palette.error.main,
                  }}
                >
                  {product.countInStock > 0
                    ? t("product.inStock")
                    : t("product.outOfStock")}
                </Box>
              </Typography>
            </CardContent>
            <CardActions sx={{ flexDirection: "column", gap: 1 }}>
              {product.countInStock > 0 && (
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={inCart ? handleRemoveFromCart : handleAddToCart}
                  sx={{ width: "100%", borderRadius: 2 }}
                >
                  {inCart
                    ? t("product.removeFromCart")
                    : t("product.addToCart")}
                </Button>
              )}
              {product.countInStock === 0 && (
                <Button
                  variant="outlined"
                  color="secondary"
                  disabled
                  sx={{ width: "100%", borderRadius: 2 }}
                >
                  {t("product.outOfStock")}
                </Button>
              )}
            </CardActions>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 8, md: 8 }}>
          <Typography variant="h4" component="h2" sx={{ mb: 2 }}>
            {t("product.customerReviews")}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {Boolean(userId) && !alreadyReviewed ? (
              t("product.leaveReview")
            ) : !userId ? (
              <>
                {t("product.signInPrompt")}{" "}
                <Link
                  to={`${loginHref}?redirect=${encodeURIComponent(productPathForRedirect)}`}
                >
                  {t("product.signIn")}
                </Link>{" "}
                {t("product.signInSuffix")}
              </>
            ) : (
              t("product.alreadyReviewed")
            )}
          </Typography>
          <ReviewList
            productId={product.id}
            reviews={reviewsForProduct}
            onSubmitted={() => setReviewsRefreshToken((t) => t + 1)}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProductDetailPage;
