"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { Experimental_CssVarsProvider as CssVarsProvider } from "@mui/material/styles";
import type { ReactNode } from "react";
import { theme } from ".";

/**
 * Provider de tema do app inteiro. O padrão é o tema claro, e não a
 * preferência do sistema: quem nunca escolheu abre no claro. A partir da
 * primeira troca vale o que o MUI guarda no localStorage.
 */
const ThemeRegistry = ({ children }: { children: ReactNode }) => (
  <CssVarsProvider theme={theme} defaultMode="light">
    {/* `enableColorScheme` emite a propriedade CSS `color-scheme`, que faz
        scrollbars e controles nativos acompanharem o tema. */}
    <CssBaseline enableColorScheme />
    {children}
  </CssVarsProvider>
);

export default ThemeRegistry;
