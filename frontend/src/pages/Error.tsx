import { useRouteError } from "react-router";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Header from "../components/Header";
import { Alert, Container } from "@mui/material";
import Footer from "../components/Footer";
import { useTranslation } from "react-i18next";

const ErrorPage = () => {
  const { t } = useTranslation();
  const error = useRouteError();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header />
      <Container
        component="main"
        sx={{
          flex: 1,
          py: 2,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Box sx={{ py: 3, textAlign: "center", width: "50%" }}>
          <Alert severity="error">
            <Typography variant="h6" sx={{ mb: 0 }}>
              {(error as { data?: { message: string }[] }).data?.[0]?.message ??
                t("error.generic")}
            </Typography>
          </Alert>
        </Box>
      </Container>
      <Footer storeLocation={null} />
    </Box>
  );
};

export default ErrorPage;
