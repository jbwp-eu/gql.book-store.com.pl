import { useState } from "react";
import type { MouseEvent } from "react";
import { useLoaderData, useFetcher, Link, redirect } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
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
import type { Product } from "../Home";
import { logout } from "../../store/authSlice";
import { store } from "../../store/store";
import { useSearch } from "../../context/SearchContext";
import {
  getLocaleFromRequest,
  localizedLoginPath,
  withLocalePath,
} from "../../i18n/locales";
import { serverT } from "../../i18n/i18n";
import { useLocale } from "../../hooks/useLocalizedPath";
import { useTranslation } from "react-i18next";
import {
  graphqlFetchHeaders,
  graphqlJsonHeaders,
} from "../../lib/graphqlHeaders";
import { graphqlHttpPost } from "../../lib/graphqlClient";
import { getAuthHeader } from "../../../utils/auth";

const PRODUCTS_QUERY = `
  query {
    products {
      id
      title
      price
      countInStock
      isFeatured
    }
  }
`;

const DELETE_PRODUCT_MUTATION = `
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id)
  }
`;

const CREATE_PRODUCT_MUTATION = `
  mutation CreateProduct {
    createProduct {
      id
      title
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

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const id = formData.get("id");
  const lng = getLocaleFromRequest(request);

  const auth = getAuthHeader();
  if (!auth) {
    store.dispatch(logout());
    return redirect(localizedLoginPath(request));
  }

  if (intent === "create") {
    const response = await graphqlHttpPost({
      query: CREATE_PRODUCT_MUTATION,
      headers: graphqlFetchHeaders(lng, auth),
    });

    const json = await response.json();
    if (json.errors) {
      const message = json.errors[0]?.message ?? "Create failed";
      const lower = message.toLowerCase();
      if (lower === "unauthorized" || lower.includes("brak autoryzacji")) {
        store.dispatch(logout());
        return redirect(localizedLoginPath(request));
      }
      throw new Response(JSON.stringify(json.errors), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!json.data?.createProduct) {
      return { error: serverT("admin.createFailed", lng) };
    }

    return redirect(
      withLocalePath(getLocaleFromRequest(request), "/admin/products")
    );
  }

  if (!id || typeof id !== "string") {
    return { error: serverT("admin.productIdRequired", lng) };
  }

  const response = await graphqlHttpPost({
    query: DELETE_PRODUCT_MUTATION,
    variables: { id },
    headers: graphqlFetchHeaders(lng, auth),
  });

  const json = await response.json();
  if (json.errors) {
    const message = json.errors[0]?.message ?? "Delete failed";
    const lower = message.toLowerCase();
    if (lower === "unauthorized" || lower.includes("brak autoryzacji")) {
      store.dispatch(logout());
      return redirect(localizedLoginPath(request));
    }
    throw new Response(JSON.stringify(json.errors), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!json.data?.deleteProduct) {
    return { error: serverT("admin.deleteFailed", lng) };
  }

  return redirect(
    withLocalePath(getLocaleFromRequest(request), "/admin/products")
  );
}

const ProductsListPage = () => {
  const { t } = useTranslation();
  const products = useLoaderData() as Product[];
  const locale = useLocale();
  const fetcher = useFetcher();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { query } = useSearch();

  const normalizedQuery = query.trim().toLowerCase();

  let filteredProducts: Product[];

  if (normalizedQuery.length === 0) {
    filteredProducts = products;
  } else {
    const prefixMatches = products.filter((p) =>
      p.title.toLowerCase().startsWith(normalizedQuery)
    );

    const baseList =
      prefixMatches.length > 0
        ? prefixMatches
        : products.filter((p) =>
            p.title.toLowerCase().includes(normalizedQuery)
          );

    // filteredProducts = baseList.slice(0, 1);
    filteredProducts = baseList;
  }

  const showNoResults =
    normalizedQuery.length > 0 && filteredProducts.length === 0;

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

  const handleDeleteConfirm = () => {
    if (!deleteId) return;
    fetcher.submit({ id: deleteId }, { method: "post" });
    setDeleteId(null);
  };

  return (
    <Box sx={{ px: 2, py: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography variant="h5" component="h1">
          {t("admin.productListTitle")}
        </Typography>
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="create" />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={fetcher.state !== "idle"}
          >
            {t("admin.createProduct")}
          </Button>
        </fetcher.Form>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t("admin.colTitle")}</TableCell>
              <TableCell align="center">{t("admin.colPrice")}</TableCell>
              <TableCell align="center">{t("admin.colStock")}</TableCell>
              <TableCell align="center">{t("admin.colFeatured")}</TableCell>
              <TableCell align="right" sx={{ pr: 8 }}>
                {t("admin.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {showNoResults ? (
              <TableRow>
                <TableCell colSpan={5}>{t("admin.noSearchResults")}</TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.title}</TableCell>
                  <TableCell align="center">{p.price.toFixed(2)} PLN</TableCell>
                  <TableCell align="center">{p.countInStock}</TableCell>
                  <TableCell align="center">
                    {p.isFeatured ? t("admin.yes") : t("admin.no")}
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
                        to={withLocalePath(
                          locale,
                          `/admin/products/${p.id}/edit`
                        )}
                        variant="outlined"
                        color="secondary"
                        size="small"
                      >
                        {t("admin.editProduct")}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={(event) => handleDeleteClick(p.id, event)}
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
        <DialogTitle>{t("admin.deleteProduct")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("admin.deleteProductConfirm")}
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

export default ProductsListPage;
