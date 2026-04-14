import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import CssBaseline from "@mui/material/CssBaseline";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
  createTheme,
  responsiveFontSizes,
  ThemeProvider,
} from "@mui/material/styles";

const STORAGE_KEY = "book-store-theme-mode";

export type ThemeModePreference = "light" | "dark" | "system";

type ThemeModeContextValue = {
  preference: ThemeModePreference;
  setPreference: (mode: ThemeModePreference) => void;
  resolvedMode: "light" | "dark";
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

function readStoredPreference(): ThemeModePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "system";
}

function buildTheme(mode: "light" | "dark") {
  const base = createTheme({
    palette: {
      mode,
      primary:
        mode === "light"
          ? { main: "#f5f5f5", light: "#fafafa", dark: "#e0e0e0" }
          : { main: "#37474f", light: "#455a64", dark: "#263238" },
      secondary:
        mode === "light"
          ? { main: "#37474f", light: "#78909c", dark: "#263238" }
          : { main: "#90a4ae", light: "#b0bec5", dark: "#78909c" },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
    shape: { borderRadius: 8 },
  });
  return responsiveFontSizes(base);
}

type ThemeModeProviderProps = {
  children: ReactNode;
};

export function ThemeModeProvider({ children }: ThemeModeProviderProps) {
  const [preference, setPreferenceState] =
    useState<ThemeModePreference>(readStoredPreference);

  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)", {
    noSsr: true,
  });

  const resolvedMode: "light" | "dark" = useMemo(() => {
    if (preference === "system") return prefersDark ? "dark" : "light";
    return preference;
  }, [preference, prefersDark]);

  const theme = useMemo(() => buildTheme(resolvedMode), [resolvedMode]);

  const setPreference = useCallback((mode: ThemeModePreference) => {
    setPreferenceState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ preference, setPreference, resolvedMode }),
    [preference, setPreference, resolvedMode]
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within a ThemeModeProvider");
  }
  return ctx;
}
