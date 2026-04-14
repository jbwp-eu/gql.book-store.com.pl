import type { ActionFunctionArgs } from "react-router";
import { Link, redirect, useActionData, useSubmit } from "react-router";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useLocalizedHref } from "../hooks/useLocalizedPath";
import { store } from "../store/store";
import { setCredentials, TOKEN_KEY } from "../store/authSlice";
import { getLocaleFromRequest, withLocalePath } from "../i18n/locales";
import { graphqlJsonHeaders } from "../lib/graphqlHeaders";
import { graphqlRequest } from "../lib/graphqlClient";
import { serverT } from "../i18n/i18n";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getRegisterSchema(t: TFunction) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(2, { message: t("profile.errors.nameShort") }),
    email: z
      .string()
      .trim()
      .min(1, { message: t("auth.emailRequired") })
      .refine((s) => emailRegex.test(s), {
        message: t("auth.validation.emailInvalid"),
      }),
    password: z
      .string()
      .min(6, { message: t("profile.errors.passwordShort") }),
  });
}

type RegisterFormValues = z.infer<ReturnType<typeof getRegisterSchema>>;

const REGISTER_MUTATION = `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        id
        name
        email
        isAdmin
      }
    }
  }
`;

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const name = (formData.get("name") as string)?.trim() ?? "";
  const email = (formData.get("email") as string)?.trim() ?? "";
  const password = (formData.get("password") as string) ?? "";
  const lng = getLocaleFromRequest(request);

  if (name.length < 2) {
    return { error: serverT("profile.errors.nameShort", lng) };
  }
  if (!email) {
    return { error: serverT("auth.emailRequired", lng) };
  }
  if (!emailRegex.test(email)) {
    return { error: serverT("auth.validation.emailInvalid", lng) };
  }
  if (password.length < 6) {
    return { error: serverT("profile.errors.passwordShort", lng) };
  }

  const json = await graphqlRequest<{
    register?: {
      token: string;
      user: { id: string; name: string; email: string; isAdmin?: boolean };
    };
  }>({
    query: REGISTER_MUTATION,
    variables: { input: { name: name, email: email, password: password } },
    headers: graphqlJsonHeaders(lng),
  });

  if (json.errors) {
    return {
      error:
        json.errors[0]?.message ?? serverT("auth.registrationFailed", lng),
    };
  }
  const payload = json.data?.register;
  if (!payload?.token || !payload?.user) {
    return { error: serverT("auth.registrationFailed", lng) };
  }
  const { token, user } = payload;
  localStorage.setItem(TOKEN_KEY, token);
  store.dispatch(
    setCredentials({
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin ?? false,
    })
  );
  return redirect(withLocalePath(getLocaleFromRequest(request), "/"));
}

const RegisterPage = () => {
  const { t } = useTranslation();
  const actionData = useActionData<{ error?: string }>();
  const submit = useSubmit();
  const homeHref = useLocalizedHref("/");

  const schema = useMemo(() => getRegisterSchema(t), [t]);
  const resolver = useMemo(() => zodResolver(schema), [schema]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<RegisterFormValues>({
    resolver,
    defaultValues: { name: "", email: "", password: "" },
  });

  const onValid = (parsed: RegisterFormValues) => {
    const live = getValues();
    const name = String(parsed?.name ?? live.name ?? "").trim();
    const email = String(parsed?.email ?? live.email ?? "").trim();
    const password = parsed?.password ?? live.password ?? "";
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("password", password);
    submit(formData, { method: "post" });
  };

  return (
    <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
      <Card sx={{ maxWidth: 400, width: "100%" }}>
        <CardContent>
          <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
            {t("auth.registerTitle")}
          </Typography>
          {actionData?.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {actionData.error}
            </Alert>
          )}
          <form noValidate onSubmit={handleSubmit(onValid)}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label={t("auth.name")}
                required
                fullWidth
                autoComplete="name"
                error={!!errors.name}
                helperText={errors.name?.message}
                {...register("name")}
              />
              <TextField
                label={t("auth.email")}
                type="email"
                required
                fullWidth
                autoComplete="email"
                error={!!errors.email}
                helperText={errors.email?.message}
                {...register("email")}
              />
              <TextField
                label={t("auth.password")}
                type="password"
                required
                fullWidth
                autoComplete="new-password"
                error={!!errors.password}
                helperText={errors.password?.message}
                {...register("password")}
              />
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 2,
                }}
              >
                <Button
                  component={Link}
                  to={homeHref}
                  variant="contained"
                  fullWidth
                >
                  {t("auth.back")}
                </Button>
                <Button type="submit" variant="contained" fullWidth>
                  {t("auth.register")}
                </Button>
              </Box>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RegisterPage;
