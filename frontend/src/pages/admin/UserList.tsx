import { useState } from "react";
import type { MouseEvent } from "react";
import { Link, useLoaderData, useFetcher, redirect } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { logout } from "../../store/authSlice";
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
import { store } from "../../store/store";
import { useSearch } from "../../context/SearchContext";
import {
  getLocaleFromRequest,
  localizedLoginPath,
  withLocalePath,
} from "../../i18n/locales";
import { useLocale } from "../../hooks/useLocalizedPath";
import { serverT } from "../../i18n/i18n";
import { useTranslation } from "react-i18next";
import { graphqlFetchHeaders } from "../../lib/graphqlHeaders";
import { graphqlHttpPost } from "../../lib/graphqlClient";
import { getAuthHeader } from "../../../utils/auth";

type User = {
  id: string;
  name: string;
  email: string;
  isAdmin?: boolean;
};

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

const DELETE_USER_MUTATION = `
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`;

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const id = formData.get("id");
  const lng = getLocaleFromRequest(request);

  if (!id || typeof id !== "string") {
    return { error: serverT("admin.userIdRequired", lng) };
  }

  const auth = getAuthHeader();
  if (!auth) {
    store.dispatch(logout());
    return redirect(localizedLoginPath(request));
  }

  const response = await graphqlHttpPost({
    query: DELETE_USER_MUTATION,
    variables: { id },
    headers: graphqlFetchHeaders(lng, auth),
  });

  const json = await response.json();
  if (json.errors) {
    const message = json.errors[0]?.message ?? "Delete failed";
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

  if (!json.data?.deleteUser) {
    return { error: serverT("admin.deleteFailed", lng) };
  }

  return redirect(
    withLocalePath(getLocaleFromRequest(request), "/admin/users")
  );
}

export async function loader({ request }: LoaderFunctionArgs) {
  const lng = getLocaleFromRequest(request);
  const response = await graphqlHttpPost({
    query: USERS_QUERY,
    headers: graphqlFetchHeaders(lng, getAuthHeader()),
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
  return json.data.users as User[];
}

const UsersListPage = () => {
  const { t } = useTranslation();
  const users = useLoaderData() as User[];
  const locale = useLocale();
  const fetcher = useFetcher();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { query } = useSearch();

  const normalizedQuery = query.trim().toLowerCase();
  let filteredUsers: User[];

  if (normalizedQuery.length === 0) {
    filteredUsers = users;
  } else {
    const prefixMatches = users.filter((u) =>
      u.name.toLowerCase().startsWith(normalizedQuery)
    );

    const baseList =
      prefixMatches.length > 0
        ? prefixMatches
        : users.filter((u) => u.name.toLowerCase().includes(normalizedQuery));

    // filteredUsers = baseList.slice(0, 1);
    filteredUsers = baseList;
  }

  const showNoResults =
    normalizedQuery.length > 0 && filteredUsers.length === 0;

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
      <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
        {t("admin.userListTitle")}
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t("admin.colName")}</TableCell>
              <TableCell>{t("admin.colEmail")}</TableCell>
              <TableCell align="center">{t("admin.colAdmin")}</TableCell>
              <TableCell align="right" sx={{ pr: 8 }}>
                {t("admin.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {showNoResults ? (
              <TableRow>
                <TableCell colSpan={4}>{t("admin.noSearchResults")}</TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell align="center">
                    {u.isAdmin ? t("admin.yes") : t("admin.no")}
                  </TableCell>
                  <TableCell align="right">
                    {!u.isAdmin ? (
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
                            `/admin/users/${u.id}/edit`
                          )}
                          variant="outlined"
                          color="secondary"
                          size="small"
                        >
                          {t("admin.editUser")}
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={(event) => handleDeleteClick(u.id, event)}
                        >
                          {t("admin.delete")}
                        </Button>
                      </Box>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={deleteId !== null} onClose={handleDeleteClose}>
        <DialogTitle>{t("admin.deleteUser")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t("admin.deleteUserConfirm")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>{t("admin.cancel")}</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={fetcher.state === "submitting"}
          >
            {t("admin.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersListPage;
