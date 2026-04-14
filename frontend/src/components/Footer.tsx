import { useState, type KeyboardEvent, type MouseEvent } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid2";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import EmailIcon from "@mui/icons-material/Email";
import PublicIcon from "@mui/icons-material/Public";
import ContactForm from "./ContactForm";
import StoreMapDialog from "./StoreMapDialog";
import type { StoreLocation } from "../types/storeLocation";
import { useTranslation } from "react-i18next";

type FooterProps = {
  storeLocation: StoreLocation | null;
};

const Footer = ({ storeLocation }: FooterProps) => {
  const { t } = useTranslation();
  const [contactOpen, setContactOpen] = useState(false);
  const [storeMapOpen, setStoreMapOpen] = useState(false);
  const theme = useTheme();
  const currentYear = new Date().getFullYear();
  const appName = import.meta.env.VITE_APP_NAME ?? "Book Store";

  const handleOpenContact = (
    event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>
  ) => {
    (event.currentTarget as HTMLElement).blur();
    setContactOpen(true);
  };

  const handleOpenStoreMap = (
    event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>
  ) => {
    (event.currentTarget as HTMLElement).blur();
    setStoreMapOpen(true);
  };

  return (
    <Box
      component="footer"
      sx={{
        borderTop: 1,
        borderColor: "divider",
        mt: "auto",
        backgroundColor: theme.palette.background.paper,
        py: 2,
      }}
    >
      <Container>
        <Card variant="outlined" sx={{ color: "text.secondary" }}>
          <CardContent sx={{ "&:last-child": { pb: 2 } }}>
            <Grid container spacing={2}>
              <Grid
                size={{ xs: 12, md: 2.4 }}
                role="button"
                tabIndex={0}
                onClick={handleOpenContact}
                onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleOpenContact(event);
                  }
                }}
                sx={{
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                  borderRadius: 1,
                  px: 0.5,
                  py: 0.5,
                }}
              >
                <EmailIcon sx={{ mb: 0.5, display: "block" }} />
                <Typography fontWeight="fontWeightBold" variant="body2">
                  {t("footer.contact")}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 2.4 }}>
                <ShoppingBagIcon sx={{ mb: 0.5, display: "block" }} />
                <Typography fontWeight="fontWeightBold" variant="body2">
                  {t("footer.shippingTitle")}
                </Typography>
                <Typography fontWeight="fontWeightLight" variant="body2">
                  {t("footer.shippingDesc")}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 2.4 }}>
                <AttachMoneyIcon sx={{ mb: 0.5, display: "block" }} />
                <Typography fontWeight="fontWeightBold" variant="body2">
                  {t("footer.moneyBackTitle")}
                </Typography>
                <Typography fontWeight="fontWeightLight" variant="body2">
                  {t("footer.moneyBackDesc")}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 2.4 }}>
                <CreditCardIcon sx={{ mb: 0.5, display: "block" }} />
                <Typography fontWeight="fontWeightBold" variant="body2">
                  {t("footer.paymentTitle")}
                </Typography>
                <Typography fontWeight="fontWeightLight" variant="body2">
                  {t("footer.paymentDesc")}
                </Typography>
              </Grid>
              <Grid
                size={{ xs: 12, md: 2.4 }}
                role="button"
                tabIndex={0}
                onClick={handleOpenStoreMap}
                onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleOpenStoreMap(event);
                  }
                }}
                sx={{
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                  borderRadius: 1,
                  px: 0.5,
                  py: 0.5,
                }}
              >
                <PublicIcon sx={{ mb: 0.5, display: "block" }} />
                <Typography fontWeight="fontWeightBold" variant="body2">
                  {t("footer.storeLocator")}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        <Typography
          variant="body2"
          color="text.secondary"
          fontWeight="fontWeightLight"
          textAlign="center"
          sx={{ mt: 2, mb: 1 }}
        >
          {currentYear} {appName}. {t("footer.rights")}
        </Typography>
        <ContactForm open={contactOpen} onClose={() => setContactOpen(false)} />
        <StoreMapDialog
          open={storeMapOpen}
          onClose={() => setStoreMapOpen(false)}
          storeLocation={storeLocation}
        />
      </Container>
    </Box>
  );
};

export default Footer;
