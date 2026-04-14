import type { Product } from "../pages/Home";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSubmit } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const MAX_COUNT = 2;

function getProductEditSchema(t: TFunction) {
  return z.object({
    title: z
      .string()
      .trim()
      .min(1, { message: t("productEdit.validation.titleRequired") }),
    description: z.string(),
    price: z
      .string()
      .trim()
      .refine((s) => s !== "", {
        message: t("productEdit.validation.priceInvalid"),
      })
      .refine(
        (s) => {
          const n = Number.parseFloat(s);
          return Number.isFinite(n) && n >= 0;
        },
        { message: t("productEdit.validation.priceInvalid") }
      ),
    countInStock: z
      .string()
      .trim()
      .refine((s) => s !== "", {
        message: t("productEdit.validation.stockInvalid"),
      })
      .refine(
        (s) => {
          const n = Number.parseInt(s, 10);
          return Number.isInteger(n) && n >= 0;
        },
        { message: t("productEdit.validation.stockInvalid") }
      ),
    isFeatured: z.boolean(),
  });
}

type ProductEditFormValues = z.infer<ReturnType<typeof getProductEditSchema>>;

/** Synthetic key for manual setError; RHF strips `root` on submit. */
type ProductEditFormModel = ProductEditFormValues & { form?: never };

function productToDefaults(product: Product): ProductEditFormValues {
  return {
    title: product.title,
    description: product.description ?? "",
    price: String(product.price),
    countInStock: String(product.countInStock),
    isFeatured: product.isFeatured ?? false,
  };
}

const ProductEditForm = ({
  product,
  actionData,
}: {
  product: Product;
  actionData?: { error?: string };
}) => {
  const { t } = useTranslation();
  const submit = useSubmit();

  const schema = useMemo(() => getProductEditSchema(t), [t]);
  const resolver = useMemo(() => zodResolver(schema), [schema]);
  const defaultValues = useMemo(() => productToDefaults(product), [product]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    setError,
    clearErrors,
    getValues,
  } = useForm<ProductEditFormModel>({
    resolver,
    defaultValues,
  });

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedFiles_2, setUploadedFiles_2] = useState<File[]>([]);
  const [fileLimit, setFileLimit] = useState(false);
  const [fileLimit_2, setFileLimit_2] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<(string | ArrayBuffer | null)[]>(
    []
  );
  const [previewUrl_2, setPreviewUrl_2] = useState<
    (string | ArrayBuffer | null)[]
  >([]);

  const filePickerRef = useRef<HTMLInputElement>(null);
  const filePickerRef_2 = useRef<HTMLInputElement>(null);

  useEffect(() => {
    reset(productToDefaults(product));
    setUploadedFiles([]);
    setUploadedFiles_2([]);
    setFileLimit(false);
    setFileLimit_2(false);
    setPreviewUrl([]);
    setPreviewUrl_2([]);
  }, [product, reset]);

  const isFeatured = watch("isFeatured");

  const onSubmit = (parsed: ProductEditFormValues) => {
    clearErrors("form");
    if (uploadedFiles.length > MAX_COUNT) {
      setError("form", {
        type: "manual",
        message: t("productEdit.maxFiles", { count: MAX_COUNT }),
      });
      return;
    }

    const live = getValues();
    const title = String(parsed?.title ?? live.title ?? "").trim();
    const description = String(
      parsed?.description ?? live.description ?? ""
    ).trim();
    const price = String(parsed?.price ?? live.price ?? "").trim();
    const countInStock = String(
      parsed?.countInStock ?? live.countInStock ?? ""
    ).trim();
    const isFeatured = parsed?.isFeatured ?? live.isFeatured ?? false;

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("price", price);
    formData.append("countInStock", countInStock);
    for (let i = 0; i < uploadedFiles.length; i++) {
      formData.append("images", uploadedFiles[i]);
    }
    for (let i = 0; i < uploadedFiles_2.length; i++) {
      formData.append("banners", uploadedFiles_2[i]);
    }
    formData.append("isFeatured", isFeatured.toString());

    submit(formData, {
      method: "patch",
      encType: "multipart/form-data",
    });
  };

  const handleUploadFiles = (files: File[]) => {
    clearErrors("form");
    const uploaded = [...uploadedFiles];
    files.some((file) => {
      if (uploaded.findIndex((f) => f.name === file.name) === -1) {
        if (files.length < 2) {
          const fileReader = new FileReader();
          uploaded.push(file);
          fileReader.onload = () => {
            setPreviewUrl((prev) => [...prev, fileReader.result]);
          };
          fileReader.readAsDataURL(file);
          if (uploadedFiles.length === 1) {
            setFileLimit(true);
          }
        } else if (files.length === 2) {
          const fileReader = new FileReader();
          uploaded.push(file);
          fileReader.onload = () => {
            setPreviewUrl((prev) => [...prev, fileReader.result]);
          };
          fileReader.readAsDataURL(file);
          setFileLimit(true);
        } else {
          alert(t("productEdit.maxFiles", { count: MAX_COUNT }));
          return true;
        }
      }
    });
    setUploadedFiles(uploaded);
  };

  useEffect(() => {
    if (uploadedFiles_2.length === 0) {
      return;
    }
    const fileReader = new FileReader();

    fileReader.onload = () => {
      setPreviewUrl_2((prev) => [...prev, fileReader.result]);
    };
    fileReader.readAsDataURL(uploadedFiles_2[0]);
    setFileLimit_2(true);
  }, [uploadedFiles_2]);

  const pickeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosenFiles = Array.prototype.slice.call(e.target.files);
    handleUploadFiles(chosenFiles);
  };

  const pickeHandler_2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosenFiles = Array.prototype.slice.call(e.target.files);
    setUploadedFiles_2(chosenFiles);
  };

  const pickImageHandler = () => {
    filePickerRef.current!.click();
  };

  const pickImageHandler_2 = () => {
    filePickerRef_2.current!.click();
  };

  return (
    <Box>
      {actionData?.error && (
        <Typography variant="body2" color="error" sx={{ mb: 2 }}>
          {actionData.error}
        </Typography>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
          }}
        >
          <TextField
            id="title"
            label={t("productEdit.titleLabel")}
            placeholder={t("productEdit.titlePlaceholder")}
            type="text"
            fullWidth
            margin="normal"
            {...register("title")}
            error={!!errors.title}
            helperText={errors.title?.message}
          />
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
          }}
        >
          <TextField
            id="countInStock"
            label={t("productEdit.stockLabel")}
            placeholder={t("productEdit.stockPlaceholder")}
            type="number"
            fullWidth
            margin="normal"
            {...register("countInStock")}
            error={!!errors.countInStock}
            helperText={errors.countInStock?.message}
          />
          <TextField
            id="price"
            label={t("productEdit.priceLabel")}
            placeholder={t("productEdit.pricePlaceholder")}
            type="number"
            slotProps={{ htmlInput: { min: 0, step: "any" } }}
            fullWidth
            margin="normal"
            {...register("price")}
            error={!!errors.price}
            helperText={errors.price?.message}
          />
        </Box>
        <TextField
          id="description"
          label={t("productEdit.descriptionLabel")}
          placeholder={t("productEdit.descriptionPlaceholder")}
          fullWidth
          margin="normal"
          multiline
          minRows={3}
          {...register("description")}
          error={!!errors.description}
          helperText={errors.description?.message}
        />
        <input
          type="file"
          multiple
          ref={filePickerRef}
          style={{ display: "none" }}
          onChange={pickeHandler}
          disabled={fileLimit}
        />

        {errors.form && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {errors.form.message}
          </Typography>
        )}

        <Box sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}>
          {previewUrl.length > 0 &&
            previewUrl.map(
              (url) =>
                typeof url === "string" && (
                  <img
                    key={url}
                    src={url}
                    alt={t("productEdit.previewAlt")}
                    style={{
                      width: 120,
                      height: "auto",
                      objectFit: "cover",
                      borderRadius: 4,
                      marginTop: 10,
                      border: "1px solid #eee",
                    }}
                  />
                )
            )}
        </Box>

        {previewUrl.length === 0 && (
          <Typography variant="body2" sx={{ mt: 2 }}>
            {t("productEdit.selectImagesHint")}
          </Typography>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
          <Button
            type="button"
            onClick={pickImageHandler}
            variant="contained"
            sx={{ mb: 2 }}
            disabled={fileLimit}
          >
            {fileLimit
              ? t("productEdit.imagesLoaded")
              : t("productEdit.chooseImages")}
          </Button>
        </Box>

        <Card className="mb-4">
          <CardContent>
            <FormControlLabel
              control={
                <Controller
                  name="isFeatured"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="isFeatured"
                      checked={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      slotProps={{ input: { ref: field.ref } }}
                      sx={{
                        p: 0.5,
                        mr: 1.5,
                        "&.Mui-checked": { color: "secondary.light" },
                      }}
                    />
                  )}
                />
              }
              label={t("productEdit.featuredProduct")}
            />

            {isFeatured && (
              <div>
                <input
                  type="file"
                  ref={filePickerRef_2}
                  style={{ display: "none" }}
                  onChange={pickeHandler_2}
                  disabled={fileLimit_2}
                />

                <Box sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}>
                  {previewUrl_2.length > 0 &&
                    previewUrl_2.map(
                      (url) =>
                        typeof url === "string" && (
                          <img
                            key={url}
                            src={url}
                            alt={t("productEdit.previewAlt")}
                            style={{
                              width: "200px",
                              height: "auto",
                              marginTop: "12px",
                              borderRadius: "4px",
                              objectFit: "cover",
                              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                            }}
                          />
                        )
                    )}
                </Box>

                {previewUrl_2.length === 0 && (
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    {t("productEdit.selectBannerHint")}
                  </Typography>
                )}

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 2,
                  }}
                >
                  <Button
                    type="button"
                    onClick={pickImageHandler_2}
                    variant="contained"
                    sx={{ mb: 2 }}
                    disabled={fileLimit_2}
                  >
                    {fileLimit_2
                      ? t("productEdit.bannerLoaded")
                      : t("productEdit.chooseBanner")}
                  </Button>
                </Box>
              </div>
            )}
          </CardContent>
        </Card>

        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
          <Button type="submit" variant="contained">
            {t("productEdit.updateProduct")}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default ProductEditForm;
