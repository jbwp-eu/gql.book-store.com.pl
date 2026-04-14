import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { getLocaleFromRequest } from "../i18n/locales";
import { graphqlJsonHeaders } from "../lib/graphqlHeaders";
import { graphqlHttpPost } from "../lib/graphqlClient";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid2";
import Typography from "@mui/material/Typography";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import ProductCard from "../components/ProductCard";
import { useTheme } from "@mui/material/styles";
import { useSearch } from "../context/SearchContext";
import ProductCarousel from "../components/ProductCarousel";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  countInStock: number;
  isFeatured?: boolean;
  images?: string[];
  banners?: string[];
  averageRating: number;
  reviewCount: number;
};

const PRODUCTS_QUERY = `
  query {
    products {
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

export async function loader({ request }: LoaderFunctionArgs) {
  const lng = getLocaleFromRequest(request);
  const response = await graphqlHttpPost({
    query: PRODUCTS_QUERY,
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
  return json.data.products as Product[];
}

type SortBy = "price" | "rating" | "title";
type SortOrder = "asc" | "desc";

function compareProducts(
  a: Product,
  b: Product,
  sortBy: SortBy,
  sortOrder: SortOrder,
  titleLocale: string
): number {
  const dir = sortOrder === "asc" ? 1 : -1;
  const va =
    sortBy === "price"
      ? a.price
      : sortBy === "rating"
        ? a.averageRating
        : a.title;
  const vb =
    sortBy === "price"
      ? b.price
      : sortBy === "rating"
        ? b.averageRating
        : b.title.toLowerCase();
  if (va !== vb)
    return (
      (typeof va === "string"
        ? va.localeCompare(vb as string)
        : Number(va) - Number(vb as number)) * dir
    );
  return a.title
    .toLowerCase()
    .localeCompare(b.title.toLowerCase(), titleLocale);
}

const HomePage = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const products = useLoaderData() as Product[];
  const { query } = useSearch();
  const [sortBy, setSortBy] = useState<SortBy>("price");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const normalizedQuery = query.trim().toLowerCase();

  let filteredProducts: Product[];

  if (normalizedQuery.length === 0) {
    filteredProducts = products;
  } else {
    const prefixMatches = products.filter((p) => {
      const title = p.title.toLowerCase();
      return title.startsWith(normalizedQuery);
    });

    const baseList =
      prefixMatches.length > 0
        ? prefixMatches
        : products.filter((p) => {
            const title = p.title.toLowerCase();
            return title.includes(normalizedQuery);
          });

    filteredProducts = baseList;
  }

  const displayProducts = useMemo(
    () =>
      [...filteredProducts].sort((a, b) =>
        compareProducts(a, b, sortBy, sortOrder, i18n.language)
      ),
    [filteredProducts, sortBy, sortOrder, i18n.language]
  );

  const showNoResults =
    normalizedQuery.length > 0 && filteredProducts.length === 0;

  const featuredBannerSlides = products
    .filter((p) => p.isFeatured === true && p.banners?.length)
    .flatMap((p) =>
      (p.banners ?? []).map((banner) => ({ productId: p.id, banner }))
    );

  return (
    <Box
      sx={{
        px: 2,
        py: 2,
        backgroundColor: theme.palette.primary.main,
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
      }}
    >
      {featuredBannerSlides.length > 0 && (
        <ProductCarousel items={featuredBannerSlides} />
      )}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          mb: 2,
        }}
      >
        <Typography variant="h6" component="h1">
          {t("home.title")}
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
          }}
        >
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <input type="hidden" name="sortBy" value={sortBy} />
            <InputLabel id="home-sort-by-label">
              {t("home.sortBy")}
              <Select
                id="home-sort-by"
                name="sortBy"
                labelId="home-sort-by-label"
                label={t("home.sortBy")}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
              >
                <MenuItem value="price">{t("home.sortPrice")}</MenuItem>
                <MenuItem value="rating">{t("home.sortRating")}</MenuItem>
                <MenuItem value="title">{t("home.sortTitle")}</MenuItem>
              </Select>
            </InputLabel>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <input type="hidden" name="sortOrder" value={sortOrder} />
            <InputLabel id="home-sort-order-label">
              {t("home.order")}
              <Select
                id="home-sort-order"
                name="sortOrder"
                labelId="home-sort-order-label"
                label={t("home.order")}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              >
                <MenuItem value="asc">{t("home.orderAsc")}</MenuItem>
                <MenuItem value="desc">{t("home.orderDesc")}</MenuItem>
              </Select>
            </InputLabel>
          </FormControl>
        </Box>
      </Box>
      {showNoResults ? (
        <Typography variant="body1" sx={{ textAlign: "center" }}>
          {t("home.noResults")}
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {displayProducts.map((p) => (
            <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <ProductCard product={p} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default HomePage;
