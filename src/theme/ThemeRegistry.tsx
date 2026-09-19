"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { Experimental_CssVarsProvider as CssVarsProvider } from "@mui/material/styles";
import type { ReactNode } from "react";
import { theme } from ".";

/**
 * Provider de tema do app inteiro. `defaultMode="system"` faz a primeira
 * visita seguir o `prefers-color-scheme` do sistema; a partir da primeira
 * escolha manual o próprio MUI persiste a preferência no localStorage.
 */
const ThemeRegistry = ({ children }: { children: ReactNode }) => (
  <CssVarsProvider theme={theme} defaultMode="system">
    {/* `enableColorScheme` emite a propriedade CSS `color-scheme`, que faz
        scrollbars e controles nativos acompanharem o tema. */}
    <CssBaseline enableColorScheme />
    {children}
  </CssVarsProvider>
);

export default ThemeRegistry;
