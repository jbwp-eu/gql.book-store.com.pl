import { Link } from "react-router";
import type { Product } from "../pages/Home";
import { useLocalizedHref } from "../hooks/useLocalizedPath";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import Rating from "@mui/material/Rating";
import { resolveImageUrl } from "../utils/imageUrl";
import { useTranslation } from "react-i18next";

const ProductCard = ({ product }: { product: Product }) => {
  const { t } = useTranslation();
  const productHref = useLocalizedHref(`/product/${product.id}`);
  const description =
    product.description?.length > 100
      ? `${product.description.slice(0, 100)}...`
      : (product.description ?? "");

  const imageHeight = 400;

  return (
    <Card
      component={Link}
      to={productHref}
      sx={{
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        textDecoration: "none",
        color: "inherit",
        transition: "transform 0.2s ease-in-out",
        "&:hover": { transform: "scale(1.01)" },
      }}
    >
      <Box
        sx={{
          height: imageHeight,
          minHeight: imageHeight,
          overflow: "hidden",
          bgcolor: "action.hover",
        }}
      >
        {product.images?.[0] && (
          <CardMedia
            component="img"
            height={imageHeight}
            image={resolveImageUrl(product.images[0]) ?? undefined}
            alt={product.title}
            sx={{ objectFit: "cover" }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </Box>
      <CardContent
        sx={{
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          "&:last-child": { pb: 2 },
        }}
      >
        <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
          {product.title}
        </Typography>
        {product.reviewCount > 0 ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              flexWrap: "wrap",
              mb: 1,
            }}
          >
            <Rating
              value={product.averageRating}
              readOnly
              precision={0.1}
              size="small"
            />
            <Typography
              variant="caption"
              color="text.secondary"
              component="span"
            >
              {product.averageRating.toFixed(1)} · {product.reviewCount}{" "}
              {product.reviewCount === 1
                ? t("productCard.rating")
                : t("productCard.ratings")}
            </Typography>
          </Box>
        ) : (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 1, display: "block" }}
          >
            {t("productCard.noRatingsYet")}
          </Typography>
        )}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 1, flex: 1 }}
        >
          {description}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: "bold" }}>
          {product.price.toFixed(2)} PLN
        </Typography>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
