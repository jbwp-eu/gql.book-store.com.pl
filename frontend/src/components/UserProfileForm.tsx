import { useEffect, useMemo } from "react";
import { Link, useActionData, useNavigate } from "react-router";
import { useSubmit } from "react-router-dom";
import { useLocalizedHref } from "../hooks/useLocalizedPath";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getUserProfileSchema(
  t: TFunction,
  initialName: string,
  initialEmail: string
) {
  return z
    .object({
      name: z
        .string()
        .trim()
        .min(2, { message: t("profile.errors.nameShort") }),
      email: z
        .string()
        .trim()
        .refine((s) => emailRegex.test(s), {
          message: t("profile.errors.emailInvalid"),
        }),
      password: z.string(),
      confirmPassword: z.string(),
    })
    .superRefine((data, ctx) => {
      const password = data.password ?? "";
      const confirmPassword = data.confirmPassword ?? "";
      if (password.length > 0) {
        if (password.length < 6) {
          ctx.addIssue({
            code: "custom",
            message: t("profile.errors.passwordShort"),
            path: ["password"],
          });
        } else if (password !== confirmPassword) {
          ctx.addIssue({
            code: "custom",
            message: t("profile.errors.passwordMismatch"),
            path: ["confirmPassword"],
          });
        }
      }

      const trimmedName = data.name?.trim() ?? "";
      const trimmedEmail = data.email?.trim() ?? "";
      if (
        trimmedName === initialName &&
        trimmedEmail === initialEmail &&
        password.length === 0
      ) {
        // RHF's handleSubmit strips `errors.root` before updating state; use `form` for form-level issues.
        ctx.addIssue({
          code: "custom",
          message: t("profile.errors.noChanges"),
          path: ["form"],
        });
      }
    });
}

type UserProfileFormValues = z.infer<ReturnType<typeof getUserProfileSchema>>;

/** Synthetic key for Zod issues; not a real input. Matches RHF `FORM_ERROR` convention. */
type UserProfileFormModel = UserProfileFormValues & { form?: never };

type UserProfileFormProps = {
  userId: string;
  initialName: string;
  initialEmail: string;
  redirectAfterSuccess?: string;
};

const UserProfileForm = ({
  userId,
  initialName,
  initialEmail,
  redirectAfterSuccess = "/",
}: UserProfileFormProps) => {
  const { t } = useTranslation();
  const homeHref = useLocalizedHref("/");
  const actionData = useActionData<{ error?: string; success?: string }>();
  const navigate = useNavigate();
  const submit = useSubmit();

  const schema = useMemo(
    () => getUserProfileSchema(t, initialName, initialEmail),
    [t, initialName, initialEmail]
  );

  const resolver = useMemo(() => zodResolver(schema), [schema]);

  const defaultValues = useMemo(
    () => ({
      name: initialName ?? "",
      email: initialEmail ?? "",
      password: "",
      confirmPassword: "",
    }),
    [initialName, initialEmail]
  );

  const {
    register,
    handleSubmit,
    reset,
    clearErrors,
    formState: { errors },
    getValues,
  } = useForm<UserProfileFormModel>({
    resolver,
    defaultValues,
  });

  useEffect(() => {
    reset({
      name: initialName ?? "",
      email: initialEmail ?? "",
      password: "",
      confirmPassword: "",
    });
  }, [initialName, initialEmail, reset]);

  useEffect(() => {
    if (!actionData?.success) return;
    const current = getValues();
    reset({
      name: current.name ?? initialName ?? "",
      email: current.email ?? initialEmail ?? "",
      password: "",
      confirmPassword: "",
    });
    const id = window.setTimeout(() => {
      navigate(redirectAfterSuccess, { replace: true });
    }, 2000);
    return () => window.clearTimeout(id);
  }, [
    actionData?.success,
    navigate,
    redirectAfterSuccess,
    reset,
    getValues,
    initialName,
    initialEmail,
  ]);

  const onValid = (parsed: UserProfileFormValues) => {
    clearErrors("form");
    // Zod 4 can return a null-prototype parsed object; merge with live form state
    // so submission never relies on an empty or oddly-shaped resolver payload.
    const live = getValues();
    const name = String(parsed?.name ?? live.name ?? "").trim();
    const email = String(parsed?.email ?? live.email ?? "").trim();
    const password = parsed?.password ?? live.password ?? "";
    const confirmPassword =
      parsed?.confirmPassword ?? live.confirmPassword ?? "";
    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("name", name);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("confirmPassword", confirmPassword);
    submit(formData, { method: "post" });
  };

  const rootOrServerError = errors.form?.message ?? actionData?.error ?? null;

  const successMessage = actionData?.success ?? null;

  return (
    <form noValidate onSubmit={handleSubmit(onValid)}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {rootOrServerError && (
          <Alert severity="error">{rootOrServerError}</Alert>
        )}
        {successMessage && <Alert severity="success">{successMessage}</Alert>}
        <TextField
          label={t("auth.name")}
          fullWidth
          required
          error={!!errors.name}
          helperText={errors.name?.message}
          {...register("name")}
        />
        <TextField
          label={t("auth.email")}
          type="email"
          fullWidth
          required
          error={!!errors.email}
          helperText={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label={t("profile.newPasswordHint")}
          type="password"
          fullWidth
          autoComplete="new-password"
          error={!!errors.password}
          helperText={errors.password?.message}
          {...register("password")}
        />
        <TextField
          label={t("profile.confirmPassword")}
          type="password"
          fullWidth
          autoComplete="new-password"
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
          <Button component={Link} to={homeHref} variant="contained" fullWidth>
            {t("auth.back")}
          </Button>
          <Button type="submit" variant="contained" fullWidth>
            {t("profile.saveChanges")}
          </Button>
        </Box>
      </Box>
    </form>
  );
};

export default UserProfileForm;
