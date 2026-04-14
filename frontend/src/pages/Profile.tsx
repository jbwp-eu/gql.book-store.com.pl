import { Navigate, redirect } from "react-router";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import type { ActionFunctionArgs } from "react-router";
import { useAppSelector } from "../store/hooks";
import type { RootState } from "../store/store";
import UserProfileForm from "../components/UserProfileForm";
import { store } from "../store/store";
import { setCredentials, logout } from "../store/authSlice";
import { getLocaleFromRequest, localizedLoginPath } from "../i18n/locales";
import { graphqlFetchHeaders } from "../lib/graphqlHeaders";
import { graphqlHttpPost } from "../lib/graphqlClient";
import { getAuthHeader } from "../../utils/auth";
import { useLocalizedHref } from "../hooks/useLocalizedPath";
import { serverT } from "../i18n/i18n";
import { useTranslation } from "react-i18next";

const UPDATE_USER_MUTATION = `
 
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
      id
      name
      email
      isAdmin
    }
  }
`;

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const lng = getLocaleFromRequest(request);
  const userId = (formData.get("userId") as string) ?? "";
  const name = (formData.get("name") as string)?.trim() ?? "";
  const email = (formData.get("email") as string)?.trim() ?? "";
  const password = (formData.get("password") as string) ?? "";
  const confirmPassword = (formData.get("confirmPassword") as string) ?? "";

  if (!userId) {
    return { error: serverT("profile.errors.userIdMissing", lng) };
  }

  if (name.length < 2) {
    return { error: serverT("profile.errors.nameShort", lng) };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: serverT("profile.errors.emailInvalid", lng) };
  }

  if (password.length > 0) {
    if (password.length < 6) {
      return { error: serverT("profile.errors.passwordShort", lng) };
    }
    if (password !== confirmPassword) {
      return { error: serverT("profile.errors.passwordMismatch", lng) };
    }
  }

  const input: {
    id: string;
    name?: string;
    email?: string;
    password?: string;
  } = { id: userId };

  if (name) input.name = name;
  if (email) input.email = email;
  if (password.length > 0) input.password = password;

  if (!input.name && !input.email && !input.password) {
    return { error: serverT("profile.errors.noChanges", lng) };
  }

  const auth = getAuthHeader();
  if (!auth) {
    store.dispatch(logout());
    return redirect(localizedLoginPath(request));
  }

  try {
    const response = await graphqlHttpPost({
      query: UPDATE_USER_MUTATION,
      variables: { input },
      headers: graphqlFetchHeaders(lng, auth),
    });
    const json = await response.json();

    if (json.errors) {
      const message =
        json.errors[0]?.message ?? serverT("profile.errors.updateFailed", lng);
      const lower = message.toLowerCase();
      if (lower === "unauthorized" || lower.includes("brak autoryzacji")) {
        store.dispatch(logout());
        return redirect(localizedLoginPath(request));
      }
      return { error: message };
    }
    const user = json.data?.updateUser;
    if (!user) {
      return { error: serverT("profile.errors.updateFailed", lng) };
    }

    store.dispatch(
      setCredentials({
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin ?? false,
      })
    );

    return { success: serverT("profile.success", lng) };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : serverT("profile.errors.updateFailed", lng),
    };
  }
}

const ProfilePage = () => {
  const { t } = useTranslation();
  const { userInfo } = useAppSelector((state: RootState) => state.auth);
  const loginHref = useLocalizedHref("/login");
  const homeHref = useLocalizedHref("/");

  if (!userInfo?.id || !userInfo?.name || !userInfo?.email) {
    return <Navigate to={loginHref} replace />;
  }

  return (
    <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
      <Card sx={{ maxWidth: 400, width: "100%" }}>
        <CardContent>
          <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
            {t("profile.title")}
          </Typography>
          <UserProfileForm
            userId={userInfo.id}
            initialName={userInfo.name}
            initialEmail={userInfo.email}
            redirectAfterSuccess={homeHref}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProfilePage;
