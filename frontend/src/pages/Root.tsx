import {
  Outlet,
  redirect,
  useLoaderData,
  useParams,
  type LoaderFunctionArgs,
} from "react-router";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { useTheme } from "@mui/material/styles";
import { logout } from "../store/authSlice";

import { useEffect } from "react";
import { useAppDispatch } from "../store/hooks";
import { getTokenDuration, tokenLoader } from "../../utils/auth";
import { SearchProvider } from "../context/SearchContext";
import { CurrencyProvider } from "../context/CurrencyContext";
import type { StoreLocation } from "../types/storeLocation";
import i18n from "../i18n/i18n";
import {
  isAppLocale,
  withLocalePath,
  DEFAULT_LOCALE,
  type AppLocale,
} from "../i18n/locales";
import { graphqlJsonHeaders } from "../lib/graphqlHeaders";
import { graphqlHttpPost } from "../lib/graphqlClient";
import { useTranslation } from "react-i18next";

const STORE_LOCATION_QUERY = `
  query StoreLocation {
    storeLocation {
      name
      latitude
      longitude
    }
  }
`;

type RootLoaderData = {
  token: string | null;
  storeLocation: StoreLocation | null;
  lang: AppLocale;
};

// const FALLBACK_DEMO_DELAY_MS = 500;

export async function loader(
  args: LoaderFunctionArgs
): Promise<RootLoaderData> {
  const langParam = args.params.lang ?? "";
  const url = new URL(args.request.url);
  if (!isAppLocale(langParam)) {
    const segments = url.pathname.split("/").filter(Boolean);
    const suffix =
      segments.length === 0
        ? "/"
        : segments.length === 1
          ? `/${segments[0]}`
          : `/${segments.slice(1).join("/")}`;

    throw redirect(`${withLocalePath(DEFAULT_LOCALE, suffix)}${url.search}`);
  }

  const lang = langParam;

  // This line artificially delays the loader function by FALLBACK_DEMO_DELAY_MS milliseconds.
  // It's useful for demo/testing the loading fallback UI (e.g., a spinner or skeleton screen).
  // await new Promise((resolve) => setTimeout(resolve, FALLBACK_DEMO_DELAY_MS));

  const token = tokenLoader() as string | null;

  try {
    const response = await graphqlHttpPost({
      query: STORE_LOCATION_QUERY,
      headers: graphqlJsonHeaders(lang),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch store location: ${response.status}`);
    }

    const json = await response.json();
    if (json.errors) {
      console.error("storeLocation GraphQL errors:", json.errors);
      return { token, storeLocation: null, lang };
    }

    return {
      token,
      storeLocation: json.data.storeLocation as StoreLocation,
      lang,
    };
  } catch (err) {
    console.error("Failed to load storeLocation:", err);
    return { token, storeLocation: null, lang };
  }
}

const Root = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { token, storeLocation, lang } = useLoaderData() as RootLoaderData;
  const params = useParams();
  const langParam = params.lang;

  useEffect(() => {
    const next = (
      langParam && isAppLocale(langParam) ? langParam : lang
    ) as AppLocale;
    if (i18n.language !== next) {
      void i18n.changeLanguage(next);
    }
  }, [lang, langParam]);

  useEffect(() => {
    if (!token) {
      return;
    }
    if (token === "EXPIRED") {
      dispatch(logout());
    }
    const tokenDuration = getTokenDuration(token);
    setTimeout(() => {
      dispatch(logout());
    }, tokenDuration);
  }, [dispatch, token]);

  return (
    <CurrencyProvider>
      <SearchProvider>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            minHeight: "100vh",
            backgroundColor: theme.palette.primary.light,
          }}
        >
          <Header />
          <Alert
            severity="info"
            variant="outlined"
            sx={{
              borderRadius: 0,
              borderLeft: "none",
              borderRight: "none",
              py: 0.5,
            }}
          >
            {t("footer.demoNotice")}
          </Alert>
          <Container component="main" sx={{ flex: 1, py: 2 }}>
            <Outlet />
          </Container>
          <Footer storeLocation={storeLocation} />
        </Box>
      </SearchProvider>
    </CurrencyProvider>
  );
};

export default Root;
