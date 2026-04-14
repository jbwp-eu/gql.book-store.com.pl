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
import {
  getLocaleFromRequest,
  isAppLocale,
  withLocalePath,
} from "../i18n/locales";
import { graphqlJsonHeaders } from "../lib/graphqlHeaders";
import { graphqlRequest } from "../lib/graphqlClient";
import { serverT } from "../i18n/i18n";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const linkSx = { textDecoration: "none", color: "inherit" };

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getLoginSchema(t: TFunction) {
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, { message: t("auth.emailRequired") })
      .refine((s) => emailRegex.test(s), {
        message: t("auth.validation.emailInvalid"),
      }),
    password: z
      .string()
      .min(1, { message: t("auth.validation.passwordRequired") }),
  });
}

type LoginFormValues = z.infer<ReturnType<typeof getLoginSchema>>;

const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
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
  const email = (formData.get("email") as string)?.trim() ?? "";
  const password = (formData.get("password") as string) ?? "";
  const lng = getLocaleFromRequest(request);
  if (!email) {
    return { error: serverT("auth.emailRequired", lng) };
  }
  if (!password) {
    return { error: serverT("auth.validation.passwordRequired", lng) };
  }

  const json = await graphqlRequest<{
    login?: {
      token: string;
      user: { id: string; name: string; email: string; isAdmin?: boolean };
    };
  }>({
    query: LOGIN_MUTATION,
    variables: { email, password },
    headers: graphqlJsonHeaders(lng),
  });

  if (json.errors) {
    return {
      error: json.errors[0]?.message ?? serverT("auth.loginFailed", lng),
    };
  }
  const payload = json.data?.login;
  if (!payload?.token || !payload?.user) {
    return { error: serverT("auth.loginFailed", lng) };
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
  const url = new URL(request.url);
  const lang = getLocaleFromRequest(request);
  const home = withLocalePath(lang, "/");
  let redirectTo = url.searchParams.get("redirect") ?? home;
  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    redirectTo = home;
  } else {
    const firstSeg = redirectTo.split("/").filter(Boolean)[0];
    if (!isAppLocale(firstSeg)) {
      redirectTo = withLocalePath(lang, redirectTo);
    }
  }
  return redirect(redirectTo);
}

const LoginPage = () => {
  const { t } = useTranslation();
  const actionData = useActionData<{ error?: string }>();
  const submit = useSubmit();
  const homeHref = useLocalizedHref("/");
  const registerHref = useLocalizedHref("/register");

  const schema = useMemo(() => getLoginSchema(t), [t]);
  const resolver = useMemo(() => zodResolver(schema), [schema]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<LoginFormValues>({
    resolver,
    defaultValues: { email: "", password: "" },
  });

  const onValid = (parsed: LoginFormValues) => {
    const live = getValues();
    const email = String(parsed?.email ?? live.email ?? "").trim();
    const password = parsed?.password ?? live.password ?? "";
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    submit(formData, { method: "post" });
  };

  return (
    <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
      <Card sx={{ maxWidth: 400, width: "100%" }}>
        <CardContent>
          <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
            {t("auth.loginTitle")}
          </Typography>
          {actionData?.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {actionData.error}
            </Alert>
          )}
          <form noValidate onSubmit={handleSubmit(onValid)}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
                fullWidth
                required
                autoComplete="current-password"
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
                  {t("auth.login")}
                </Button>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                {t("auth.notRegistered")}{" "}
                <Box
                  component={Link}
                  to={registerHref}
                  sx={{
                    ...linkSx,
                    display: "inline",
                    fontWeight: 500,
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  {t("auth.register")}
                </Box>
              </Typography>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
