import { Link } from "react-router";
import Box from "@mui/material/Box";
import { useLocalizedHref } from "../hooks/useLocalizedPath";
import { useTranslation } from "react-i18next";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";

const linkSx = {
  textDecoration: "none",
  color: "inherit",
  "&:hover": { backgroundColor: "secondary.main", borderRadius: "3px" },
};

const AdminMenu = () => {
  const { t } = useTranslation();
  const overviewHref = useLocalizedHref("/admin/overview");
  const productsHref = useLocalizedHref("/admin/products");
  const usersHref = useLocalizedHref("/admin/users");
  const ordersHref = useLocalizedHref("/admin/orders");
  const reviewsHref = useLocalizedHref("/admin/reviews");

  return (
    <List
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0,
      }}
    >
      <ListItem disablePadding>
        <Box
          component={Link}
          to={overviewHref}
          sx={{
            ...linkSx,
            padding: "3px 8px",
            borderRadius: "8px",
            "&:hover": { backgroundColor: "secondary.light" },
          }}
        >
          <ListItemText primary={t("adminMenu.overview")} />
        </Box>
      </ListItem>
      <ListItem disablePadding>
        <Box
          component={Link}
          to={productsHref}
          sx={{
            ...linkSx,
            padding: "3px 8px",
            borderRadius: "8px",
            "&:hover": { backgroundColor: "secondary.light" },
          }}
        >
          <ListItemText primary={t("adminMenu.products")} />
        </Box>
      </ListItem>
      <ListItem disablePadding>
        <Box
          component={Link}
          to={usersHref}
          sx={{
            ...linkSx,
            padding: "3px 8px",
            borderRadius: "8px",
            "&:hover": { backgroundColor: "secondary.light" },
          }}
        >
          <ListItemText primary={t("adminMenu.users")} />
        </Box>
      </ListItem>
      <ListItem disablePadding>
        <Box
          component={Link}
          to={ordersHref}
          sx={{
            ...linkSx,
            padding: "3px 8px",
            borderRadius: "8px",
            "&:hover": { backgroundColor: "secondary.light" },
          }}
        >
          <ListItemText primary={t("adminMenu.orders")} />
        </Box>
      </ListItem>
      <ListItem disablePadding>
        <Box
          component={Link}
          to={reviewsHref}
          sx={{
            ...linkSx,
            padding: "3px 8px",
            borderRadius: "8px",
            "&:hover": { backgroundColor: "secondary.light" },
          }}
        >
          <ListItemText primary={t("adminMenu.reviews")} />
        </Box>
      </ListItem>
    </List>
  );
};

export default AdminMenu;
