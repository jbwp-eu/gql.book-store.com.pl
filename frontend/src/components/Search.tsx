import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import { useSearch } from "../context/SearchContext";
import { useTranslation } from "react-i18next";

const Search = () => {
  const { t } = useTranslation();
  const { query, setQuery } = useSearch();

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 240 }}>
      <Box sx={{ flex: 1 }}>
        <TextField
          size="small"
          placeholder={t("search.placeholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "background.paper",
              height: 40,
            },
          }}
        />
      </Box>
    </Box>
  );
};

export default Search;
