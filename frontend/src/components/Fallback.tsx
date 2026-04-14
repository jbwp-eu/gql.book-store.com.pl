import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

const Fallback = () => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}
    >
      {/* 
            color="inherit" makes CircularProgress use the current text color of its parent.
            In this case, since the parent Box does not specify a color, it inherits the global text color,
            which is usually set by the theme (typically the "text.primary" value in MUI).
            
            To define a different global text color, you can customize your theme (e.g. "palette.text.primary") when creating your ThemeProvider.
            Example:
              import { createTheme, ThemeProvider } from "@mui/material/styles";
              const theme = createTheme({
                palette: {
                  text: {
                    primary: "#1976d2", // your preferred global text color
                  },
                },
              });
              // Then wrap your app with <ThemeProvider theme={theme}>...</ThemeProvider>
          */}
      <CircularProgress color="inherit" />
    </Box>
  );
};

export default Fallback;
