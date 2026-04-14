import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n/i18n";
import { Provider } from "react-redux";
import { useTheme } from "@mui/material/styles";
import { Toaster } from "react-hot-toast";

import App from "./App.tsx";
import { store } from "./store/store";
import { ThemeModeProvider } from "./context/ThemeModeProvider";

function ThemedToaster() {
  const theme = useTheme();
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: theme.palette.background.paper,
          color: theme.palette.text.primary,
          border: `1px solid ${theme.palette.divider}`,
        },
      }}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeModeProvider>
        <App />
        <ThemedToaster />
      </ThemeModeProvider>
    </Provider>
  </StrictMode>
);
