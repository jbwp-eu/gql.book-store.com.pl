import { useActionData, useLoaderData, redirect } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import Box from "@mui/material/Box";
import ProductEditForm from "../../components/ProductEditForm";
import type { Product } from "../Home";
import { store } from "../../store/store";
import { logout } from "../../store/authSlice";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import {
  getLocaleFromRequest,
  localizedLoginPath,
  withLocalePath,
} from "../../i18n/locales";
import { graphqlFetchHeaders, graphqlJsonHeaders } from "../../lib/graphqlHeaders";
import { graphqlHttpPost, getGraphqlHttpBaseUrl } from "../../lib/graphqlClient";
import { getAuthHeader } from "../../../utils/auth";
import { serverT } from "../../i18n/i18n";
import Typography from "@mui/material/Typography";

const PRODUCT_QUERY = `
  query Product($id: ID!) {
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

const UPDATE_PRODUCT_MUTATION = `
  mutation UpdateProduct($input: UpdateProductInput!) {
    updateProduct(input: $input) {
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

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const lng = getLocaleFromRequest(request);

  const productId =
    params.productId ?? (formData.get("productId") as string) ?? "";
  const title = (formData.get("title") as string)?.trim() ?? "";
  const description = ((formData.get("description") as string) ?? "").trim();
  const priceRaw = (formData.get("price") as string) ?? "";
  const countInStockRaw = (formData.get("countInStock") as string) ?? "";
  const isFeaturedRaw = (formData.get("isFeatured") as string) ?? "false";

  if (!productId) {
    return { error: serverT("admin.productIdRequired", lng) };
  }
  if (!title) {
    return { error: serverT("productEdit.validation.titleRequired", lng) };
  }
  const price = Number.parseFloat(priceRaw);
  if (!Number.isFinite(price) || price < 0) {
    return { error: serverT("productEdit.validation.priceInvalid", lng) };
  }
  const countInStock = Number.parseInt(countInStockRaw, 10);
  if (!Number.isInteger(countInStock) || countInStock < 0) {
    return { error: serverT("productEdit.validation.stockInvalid", lng) };
  }

  const auth = getAuthHeader();
  if (!auth) {
    store.dispatch(logout());
    return redirect(localizedLoginPath(request));
  }

  // The form sends image files under "images" and banner files under "banners"
  const newImageFiles = formData.getAll("images") as File[];
  const newBannerFiles = formData.getAll("banners") as File[];

  const uploadEndpoint = `${getGraphqlHttpBaseUrl()}/api/upload-image`;

  const uploadedImageIds: string[] = [];
  const uploadedBannerIds: string[] = [];

  for (const file of newImageFiles) {
    if (!(file instanceof File) || file.size === 0) continue;
    const uploadForm = new FormData();
    uploadForm.append("file", file);
    try {
      const response = await fetch(uploadEndpoint, {
        method: "POST",
        body: uploadForm,
      });
      if (!response.ok) {
        return { error: serverT("productEdit.imageUploadFailed", lng) };
      }
      const json = (await response.json()) as {
        id?: string;
        path?: string;
        url?: string;
      };
      if (json.id) {
        uploadedImageIds.push(json.id);
      } else if (json.path) {
        uploadedImageIds.push(json.path);
      } else if (json.url) {
        uploadedImageIds.push(json.url);
      }
    } catch (err) {
      return {
        error:
          err instanceof Error
            ? err.message
            : serverT("productEdit.uploadRequestFailed", lng),
      };
    }
  }

  for (const file of newBannerFiles) {
    if (!(file instanceof File) || file.size === 0) continue;
    const uploadForm = new FormData();
    uploadForm.append("file", file);
    try {
      const response = await fetch(uploadEndpoint, {
        method: "POST",
        body: uploadForm,
      });
      if (!response.ok) {
        return { error: serverT("productEdit.bannerUploadFailed", lng) };
      }
      const json = (await response.json()) as {
        id?: string;
        path?: string;
        url?: string;
      };
      if (json.id) {
        uploadedBannerIds.push(json.id);
      } else if (json.path) {
        uploadedBannerIds.push(json.path);
      } else if (json.url) {
        uploadedBannerIds.push(json.url);
      }
    } catch (err) {
      return {
        error:
          err instanceof Error
            ? err.message
            : serverT("productEdit.uploadRequestFailed", lng),
      };
    }
  }

  const finalImages = [...uploadedImageIds];
  const finalBanners = [...uploadedBannerIds];

  const input: {
    id: string;
    title: string;
    description?: string;
    price: number;
    countInStock: number;
    isFeatured: boolean;
    images?: string[];
    banners?: string[];
  } = {
    id: productId,
    title,
    price,
    countInStock,
    isFeatured: isFeaturedRaw === "true",
  };
  if (description) {
    input.description = description;
  }
  if (finalImages.length > 0) {
    input.images = finalImages;
  }
  if (finalBanners.length > 0) {
    input.banners = finalBanners;
  }

  try {
    const response = await graphqlHttpPost({
      query: UPDATE_PRODUCT_MUTATION,
      variables: { input },
      headers: graphqlFetchHeaders(lng, auth),
    });
    const json = await response.json();
    if (json.errors) {
      const message =
        json.errors[0]?.message ?? serverT("profile.errors.updateFailed", lng);
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
      return { error: message };
    }
    const updated = json.data?.updateProduct ?? null;
    if (!updated) {
      return { error: serverT("profile.errors.updateFailed", lng) };
    }
    return redirect(withLocalePath(lng, "/admin/products"));
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : serverT("profile.errors.updateFailed", lng),
    };
  }
}

const ProductEditPage = () => {
  const product = useLoaderData() as Product;
  const actionData = useActionData<{ error?: string }>() ?? null;

  return (
    <Box sx={{ px: 2, py: 2, display: "flex", justifyContent: "center" }}>
      <Card sx={{ maxWidth: 600, width: "100%" }}>
        <CardContent>
          <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
            Edit product
          </Typography>
          <ProductEditForm
            product={product}
            actionData={actionData ?? undefined}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProductEditPage;
