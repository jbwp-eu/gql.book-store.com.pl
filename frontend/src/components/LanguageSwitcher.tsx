import { Link, useLocation } from "react-router";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useTranslation } from "react-i18next";
import {
  SUPPORTED_LOCALES,
  localizedFullPath,
  type AppLocale,
} from "../i18n/locales";
import { useLocale } from "../hooks/useLocalizedPath";

const SHORT_LABEL: Record<AppLocale, string> = {
  pl: "PL",
  en: "EN",
};

const ARIA_KEY: Record<AppLocale, "nav.localePl" | "nav.localeEn"> = {
  pl: "nav.localePl",
  en: "nav.localeEn",
};

/** Background images for locale buttons (Poland / United Kingdom). */
const FLAG_URL: Record<AppLocale, string> = {
  pl: "https://flagcdn.com/w80/pl.png",
  en: "https://flagcdn.com/w80/gb.png",
};

const LanguageSwitcher = () => {
  const location = useLocation();
  const current = useLocale();
  const { t } = useTranslation();

  return (
    <Box
      component="nav"
      aria-label={t("nav.language")}
      sx={{ display: "flex", gap: 0.5, alignItems: "center", flexShrink: 0 }}
    >
      {SUPPORTED_LOCALES.map((locale) => {
        const to = localizedFullPath(
          location.pathname,
          location.search,
          location.hash,
          locale
        );
        const active = locale === current;
        const flag = FLAG_URL[locale];
        return (
          <Button
            key={locale}
            component={Link}
            to={to}
            size="small"
            variant="text"
            aria-current={active ? "page" : undefined}
            aria-label={t(ARIA_KEY[locale])}
            sx={{
              textTransform: "none",
              fontWeight: 900,
              minWidth: 44,
              py: 0.5,
              px: 1,
              color: "primary.contrastText",
              // textShadow: "0 0 4px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,0.8)",
              // border: "1px solid",
              // borderColor: active ? "secondary.main" : "divider",
              boxShadow: active
                ? (theme) => `0 0 0 2px ${theme.palette.secondary.light}`
                : "none",
              // backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${flag})`,
              backgroundImage: `url(${flag})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              "&:hover": {
                backgroundImage: `linear-gradient(rgba(0,0,0,0.22), rgba(0,0,0,0.22)), url(${flag})`,
              },
            }}
          >
            {SHORT_LABEL[locale]}
          </Button>
        );
      })}
    </Box>
  );
};

export default LanguageSwitcher;
