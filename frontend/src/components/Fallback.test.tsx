import { render, screen } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { describe, expect, it } from "vitest";
import Fallback from "./Fallback";

describe("Fallback", () => {
  it("renders a loading indicator", () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <Fallback />
      </ThemeProvider>
    );

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
