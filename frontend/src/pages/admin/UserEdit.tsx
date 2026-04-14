import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData } from "react-router";
import UserProfileForm from "../../components/UserProfileForm";
import { logout } from "../../store/authSlice";
import { store } from "../../store/store";
import { getLocaleFromRequest, localizedLoginPath } from "../../i18n/locales";
import { graphqlFetchHeaders } from "../../lib/graphqlHeaders";
import { graphqlHttpPost } from "../../lib/graphqlClient";
import { getAuthHeader } from "../../../utils/auth";
import { serverT } from "../../i18n/i18n";
import { useLocalizedHref } from "../../hooks/useLocalizedPath";

const USERS_QUERY = `
  query {
    users {
      id
      name
      email
      isAdmin
    }
  }
`;

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

type User = {
  id: string;
  name: string;
  email: string;
  isAdmin?: boolean;
};

export async function loader({ params, request }: LoaderFunctionArgs) {
  const lng = getLocaleFromRequest(request);
  const auth = getAuthHeader();
  if (!auth) {
    store.dispatch(logout());
    return redirect(localizedLoginPath(request));
  }

  const response = await graphqlHttpPost({
    query: USERS_QUERY,
    headers: graphqlFetchHeaders(lng, auth),
  });

  if (!response.ok) {
    throw new Response(await response.text(), { status: response.status });
  }

  const json = await response.json();
  if (json.errors) {
    const message = json.errors[0]?.message ?? "Failed to load users";
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
    throw new Response(JSON.stringify(json.errors), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const users = (json.data.users ?? []) as User[];
  const user = users.find((u) => u.id === params.userId);

  if (!user) {
    throw new Response("User not found", { status: 404 });
  }

  if (user.isAdmin) {
    throw new Response("Cannot edit admin user", { status: 403 });
  }

  return user;
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const lng = getLocaleFromRequest(request);
  const name = (formData.get("name") as string)?.trim() ?? "";
  const email = (formData.get("email") as string)?.trim() ?? "";
  const password = (formData.get("password") as string) ?? "";
  const confirmPassword = (formData.get("confirmPassword") as string) ?? "";

  const userId = params.userId ?? "";

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
    const user = json.data?.updateUser;
    if (!user) {
      return { error: serverT("profile.errors.updateFailed", lng) };
    }

    return { success: serverT("admin.userUpdateSuccess", lng) };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : serverT("profile.errors.updateFailed", lng),
    };
  }
}

const UserEditPage = () => {
  const user = useLoaderData() as User;
  const usersListHref = useLocalizedHref("/admin/users");

  return (
    <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
      <Card sx={{ maxWidth: 400, width: "100%" }}>
        <CardContent>
          <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
            Edit user
          </Typography>
          <UserProfileForm
            userId={user.id}
            initialName={user.name}
            initialEmail={user.email}
            redirectAfterSuccess={usersListHref}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default UserEditPage;
