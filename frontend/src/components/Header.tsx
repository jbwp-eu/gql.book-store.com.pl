import { Link } from "react-router";
import { useState } from "react";
import { useLocalizedHref } from "../hooks/useLocalizedPath";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import type { RootState } from "../store/store";
import { logout } from "../store/authSlice";
import { useTheme } from "@mui/material/styles";
import Search from "./Search";
import ThemeModeToggle from "./ThemeModeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import Navigation from "./Navigation";
import AdminMenu from "./AdminMenu";

const linkSx = { textDecoration: "none", color: "inherit" };

const Header = () => {
  const homeHref = useLocalizedHref("/");
  const dispatch = useAppDispatch();
  const { userInfo } = useAppSelector((state: RootState) => state.auth);
  const isLoggedIn = Boolean(userInfo?.name && userInfo?.email);
  const theme = useTheme();
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const handleLogoClick = () => {
    setShowAdminMenu(false);
  };

  const handleAdminOverview = () => {
    setShowAdminMenu(true);
  };

  const logo = (
    <Button
      variant="text"
      component={Link}
      to={homeHref}
      onClick={handleLogoClick}
      sx={{
        ...linkSx,
        pl: 0,
        "&:hover": { textDecoration: "underline" },
        mr: { sm: 8 },
      }}
    >
      <img src="/logo.svg" alt="logo" width="40px" />
      <Typography
        variant="h5"
        component="h1"
        sx={{ ml: 2, textTransform: "none !important" }}
      >
        {import.meta.env.VITE_APP_NAME}
      </Typography>
    </Button>
  );

  return (
    <Box
      component="header"
      sx={{
        borderBottom: 1,
        borderColor: "divider",
        backgroundColor: theme.palette.primary.main,
      }}
    >
      <Container sx={{ py: 2 }}>
        {/* Mobile layout (xs): top row (logo + MenuIcon), second row (controls) */}
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            flexDirection: "column",
            gap: 1,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            {logo}
            <Navigation
              isLoggedIn={isLoggedIn}
              userInfo={userInfo}
              onLogout={() => dispatch(logout())}
              onAdminOverviewClick={handleAdminOverview}
            />
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <ThemeModeToggle />
            <Search />
            <LanguageSwitcher />
            {userInfo?.isAdmin && showAdminMenu && <AdminMenu />}
          </Box>
        </Box>

        {/* Desktop layout (md+): single row with wrapping */}
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          {logo}

          {userInfo?.isAdmin && showAdminMenu && <AdminMenu />}

          <Box
            sx={{
              display: "flex",
              flexGrow: 1,
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <ThemeModeToggle />
            <Search />
            <LanguageSwitcher />
          </Box>

          <Navigation
            isLoggedIn={isLoggedIn}
            userInfo={userInfo}
            onLogout={() => dispatch(logout())}
            onAdminOverviewClick={handleAdminOverview}
          />
        </Box>
      </Container>
    </Box>
  );
};

export default Header;
