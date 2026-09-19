import type { Components, CssVarsTheme, Theme } from "@mui/material/styles";

/**
 * Overrides que valem para os dois esquemas.
 *
 * Aqui é `theme.vars`, e não `theme.palette`: o AppBar é renderizado no
 * servidor, e ler o valor resolvido gravaria o hex do esquema padrão na
 * classe do Emotion — o cliente geraria outra classe e a hidratação acusaria
 * divergência. A variável CSS é a mesma string nos dois esquemas.
 */
export const components: Components<Omit<Theme, "components"> & CssVarsTheme> = {
  MuiAppBar: {
    // A navbar e o rodapé pintam o próprio fundo a partir de `brand.chrome`;
    // o default (`primary`) traria de volta o acoplamento com o acento.
    defaultProps: { color: "transparent" },
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: theme.vars.palette.brand.chrome,
        color: theme.vars.palette.brand.chromeContrast,
        backgroundImage: "none",
      }),
    },
  },
};
