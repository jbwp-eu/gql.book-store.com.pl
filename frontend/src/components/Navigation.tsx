import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useLocalizedHref } from "../hooks/useLocalizedPath";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import ShoppingCart from "@mui/icons-material/ShoppingCart";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { useAppSelector } from "../store/hooks";
import { useTranslation } from "react-i18next";

/** Matches desktop user menu items (16px) for the mobile drawer list. */
const mobileDrawerListItemTextProps = {
  primaryTypographyProps: {
    variant: "body1" as const,
    sx: { fontSize: 16 },
  },
};

type NavigationProps = {
  isLoggedIn: boolean;
  userInfo: {
    id: string | null;
    name: string | null;
    email: string | null;
    isAdmin: boolean | null;
  };
  onLogout: () => void;
  onAdminOverviewClick: () => void;
};

const Navigation = ({
  isLoggedIn,
  userInfo,
  onLogout,
  onAdminOverviewClick,
}: NavigationProps) => {
  const { t } = useTranslation();
  const homeHref = useLocalizedHref("/");
  const cartHref = useLocalizedHref("/cart");
  const loginHref = useLocalizedHref("/login");
  const profileHref = useLocalizedHref("/profile");
  const myOrdersHref = useLocalizedHref("/my-orders");
  const myReviewsHref = useLocalizedHref("/my-reviews");
  const adminOverviewHref = useLocalizedHref("/admin/overview");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const cartItems = useAppSelector((state) => state.cart.items);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    // If auth state flips (e.g. logout), ensure we don't keep a stale anchor element.
    if (!isLoggedIn) setAnchorEl(null);
  }, [isLoggedIn]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMobileMenuOpen = () => {
    setMobileMenuOpen(true);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
  };

  const handleLogoutClick = () => {
    handleMenuClose();
    onLogout();
    navigate(homeHref);
  };

  const handleProfileClick = () => {
    handleMenuClose();
    navigate(profileHref);
  };

  const handleMyOrdersClick = () => {
    handleMenuClose();
    navigate(myOrdersHref);
  };

  const handleMyReviewsClick = () => {
    handleMenuClose();
    navigate(myReviewsHref);
  };

  const handleAdminOverviewClick = () => {
    handleMenuClose();
    onAdminOverviewClick();
    navigate(adminOverviewHref);
  };

  const handleMobileLogoutClick = () => {
    handleMobileMenuClose();
    onLogout();
    navigate(homeHref);
  };

  const handleMobileAdminOverviewClick = () => {
    handleMobileMenuClose();
    onAdminOverviewClick();
    navigate(adminOverviewHref);
  };

  return (
    <Box
      component="nav"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        order: { xs: 1, md: 2 },
        flexGrow: 1,
        justifyContent: "flex-end",
        flexWrap: "wrap",
      }}
    >
      <IconButton
        component={Link}
        to={cartHref}
        aria-label={t("nav.cart")}
        sx={{ display: { xs: "inline-flex", md: "none" } }}
      >
        <Badge badgeContent={cartCount} color="secondary">
          <ShoppingCart sx={{ color: "secondary.main" }} />
        </Badge>
      </IconButton>
      <IconButton
        onClick={handleMobileMenuOpen}
        aria-label="Open menu"
        sx={{ display: { xs: "inline-flex", md: "none" } }}
      >
        <MenuIcon />
      </IconButton>

      <Button
        component={Link}
        to={cartHref}
        variant="outlined"
        size="medium"
        startIcon={
          <Badge badgeContent={cartCount} color="secondary">
            <ShoppingCart sx={{ color: "secondary.main" }} />
          </Badge>
        }
        sx={{
          textDecoration: "none",
          color: "inherit",
          display: { xs: "none", md: "inline-flex" },
        }}
      >
        {t("nav.cart")}
      </Button>

      {!isLoggedIn ? (
        <>
          <Button
            component={Link}
            to={loginHref}
            variant="contained"
            size="medium"
            sx={{
              color: "black",
              "&:hover": { textDecoration: "underline" },
              display: { xs: "none", md: "inline-flex" },
            }}
          >
            {t("nav.login")}
          </Button>
        </>
      ) : (
        <>
          <Typography
            component="span"
            role="button"
            tabIndex={0}
            variant="body1"
            color="text.secondary"
            sx={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              bgcolor: "secondary.light",
              color: "primary.contrastText",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              userSelect: "none",
              display: { xs: "none", md: "flex" },
            }}
            onClick={handleMenuOpen}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setAnchorEl(e.currentTarget as HTMLElement);
              }
            }}
            aria-controls={menuOpen ? "user-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={menuOpen ? "true" : undefined}
          >
            {userInfo.name?.charAt(0).toUpperCase() ?? "U"}
          </Typography>

          <Menu
            id="user-menu"
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            sx={{ mt: 1 }}
          >
            <MenuItem sx={{ fontSize: 16, pb: 0 }}>{userInfo.name}</MenuItem>
            <MenuItem sx={{ fontSize: 16, pt: 0 }}>{userInfo.email}</MenuItem>
            <MenuItem sx={{ fontSize: 16 }} onClick={handleProfileClick}>
              {t("nav.userProfile")}
            </MenuItem>
            <MenuItem sx={{ fontSize: 16 }} onClick={handleMyOrdersClick}>
              {t("nav.myOrders")}
            </MenuItem>
            <MenuItem sx={{ fontSize: 16 }} onClick={handleMyReviewsClick}>
              {t("nav.myReviews")}
            </MenuItem>
            <Divider />
            {userInfo.isAdmin && (
              <MenuItem onClick={handleAdminOverviewClick}>
                {t("nav.adminOverview")}
              </MenuItem>
            )}
            <MenuItem sx={{ fontSize: 16 }} onClick={handleLogoutClick}>
              {t("nav.logout")}
            </MenuItem>
          </Menu>
        </>
      )}

      {/* Mobile sidebar */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={handleMobileMenuClose}
        slotProps={{
          root: { keepMounted: true },
          paper: { sx: { width: 290 } },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography
              variant="h6"
              component="div"
              sx={{ fontSize: "1.125rem", fontWeight: 600 }}
            >
              {import.meta.env.VITE_APP_NAME}
            </Typography>
            <IconButton onClick={handleMobileMenuClose} aria-label="Close menu">
              <CloseIcon />
            </IconButton>
          </Box>
          <List disablePadding>
            <ListItemButton
              component={Link}
              to={cartHref}
              onClick={handleMobileMenuClose}
            >
              <ListItemText
                {...mobileDrawerListItemTextProps}
                primary={t("nav.cart")}
              />
            </ListItemButton>
            {isLoggedIn && (
              <>
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, fontSize: 16 }}
                  >
                    {userInfo.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: 14 }}
                  >
                    {userInfo.email}
                  </Typography>
                </Box>
              </>
            )}

            {!isLoggedIn ? (
              <ListItemButton
                component={Link}
                to={loginHref}
                onClick={handleMobileMenuClose}
              >
                <ListItemText
                  {...mobileDrawerListItemTextProps}
                  primary={t("nav.login")}
                />
              </ListItemButton>
            ) : (
              <>
                <ListItemButton
                  component={Link}
                  to={profileHref}
                  onClick={handleMobileMenuClose}
                >
                  <ListItemText
                    {...mobileDrawerListItemTextProps}
                    primary={t("nav.userProfile")}
                  />
                </ListItemButton>
                <ListItemButton
                  component={Link}
                  to={myOrdersHref}
                  onClick={handleMobileMenuClose}
                >
                  <ListItemText
                    {...mobileDrawerListItemTextProps}
                    primary={t("nav.myOrders")}
                  />
                </ListItemButton>
                <ListItemButton
                  component={Link}
                  to={myReviewsHref}
                  onClick={handleMobileMenuClose}
                >
                  <ListItemText
                    {...mobileDrawerListItemTextProps}
                    primary={t("nav.myReviews")}
                  />
                </ListItemButton>

                <Divider />

                {userInfo.isAdmin && (
                  <ListItemButton onClick={handleMobileAdminOverviewClick}>
                    <ListItemText
                      {...mobileDrawerListItemTextProps}
                      primary={t("nav.adminOverview")}
                    />
                  </ListItemButton>
                )}

                <ListItemButton onClick={handleMobileLogoutClick}>
                  <ListItemText
                    {...mobileDrawerListItemTextProps}
                    primary={t("nav.logout")}
                  />
                </ListItemButton>
              </>
            )}
          </List>
        </Box>
      </Drawer>
    </Box>
  );
};

export default Navigation;
