import {
  experimental_extendTheme as extendTheme,
  type CssVarsTheme,
} from "@mui/material/styles";
import { components } from "./components";
import { darkPalette, lightPalette } from "./palette";
import { typography } from "./typography";

export { brandPurple, themeColor } from "./palette";

declare module "@mui/material/styles" {
  /**
   * O tema em modo CSS variables expõe `vars`, mas a tipagem padrão do `sx`
   * ainda usa o `Theme` clássico. Declarar aqui permite que os componentes
   * leiam `theme.vars.palette.*` — necessário em tudo que é renderizado no
   * servidor, onde o valor resolvido divergiria entre servidor e cliente.
   */
  interface Theme {
    vars: CssVarsTheme["vars"];
  }
}

/**
 * Tema único com os dois esquemas. O MUI emite cada paleta como variáveis CSS
 * (`--mui-palette-*`), então trocar de tema é trocar o atributo
 * `data-mui-color-scheme` no `<html>` — sem re-render da árvore React, e com
 * as cores acessíveis também a partir do `globals.css`.
 */
export const theme = extendTheme({
  colorSchemes: {
    light: { palette: lightPalette },
    dark: { palette: darkPalette },
  },
  typography,
  components,
});
