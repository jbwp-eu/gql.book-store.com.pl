import type { MouseEvent } from "react";
import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import BrightnessAutoIcon from "@mui/icons-material/BrightnessAuto";
import { useTranslation } from "react-i18next";
import {
  useThemeMode,
  type ThemeModePreference,
} from "../context/ThemeModeProvider";

const ThemeModeToggle = () => {
  const { t } = useTranslation();
  const { preference, setPreference } = useThemeMode();

  const handleChange = (
    _event: MouseEvent<HTMLElement>,
    value: ThemeModePreference | null
  ) => {
    if (value !== null) setPreference(value);
  };

  return (
    <Box
      component="nav"
      aria-label={t("nav.theme")}
      sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}
    >
      <ToggleButtonGroup
        value={preference}
        exclusive
        size="small"
        onChange={handleChange}
        aria-label={t("nav.theme")}
        sx={{
          "& .MuiToggleButton-root": {
            px: 1,
            py: 0.5,
            borderColor: "divider",
          },
        }}
      >
        <Tooltip title={t("nav.themeLight")}>
          <ToggleButton value="light" aria-label={t("nav.themeLight")}>
            <LightModeIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>
        <Tooltip title={t("nav.themeDark")}>
          <ToggleButton value="dark" aria-label={t("nav.themeDark")}>
            <DarkModeIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>
        <Tooltip title={t("nav.themeSystem")}>
          <ToggleButton value="system" aria-label={t("nav.themeSystem")}>
            <BrightnessAutoIcon fontSize="small" />
          </ToggleButton>
        </Tooltip>
      </ToggleButtonGroup>
    </Box>
  );
};

export default ThemeModeToggle;
