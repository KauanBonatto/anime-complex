import { createTheme } from "@mui/material";

const primary = {
  50: '#ece6ec',
  100: '#c3b1c4',
  200: '#a68ba7',
  300: '#7d557f',
  400: '#643566',
  500: '#3d0240',
  600: '#38023a',
  700: '#2b012d',
  800: '#220123',
  900: '#1a011b',
  contrastText: '#fff'
}

export const theme = createTheme({
  typography: {
    allVariants: {
      color: primary[500],
    },
    fontFamily: [
      "__Rubik_98e1b5",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
  },
  palette: {
    text: {
      primary: "#0e000f",
      secondary: "#ffffff",
    },
    background: {
      default: "#3d0240",
      paper: "#e6e6e6",
    },
    action: {
      active: "#ffffff",
    },
    primary,
    common: {
      black: "#0e000f",
      white: "#ffffff",
    },
  },
});