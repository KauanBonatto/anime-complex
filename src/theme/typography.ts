import type { TypographyOptions } from "@mui/material/styles/createTypography";

/**
 * Variável CSS emitida pelo `next/font` no layout. Usar a variável em vez do
 * nome da família evita o hash chumbado que existia antes ("__Rubik_98e1b5"),
 * que dessincronizava em silêncio sempre que o Next regerava a classe.
 *
 * O `next/font` só aceita literais na chamada do loader, então este nome
 * aparece também em `src/app/layout.tsx` e os dois precisam bater.
 */
export const FONT_VARIABLE = "--font-rubik";

export const typography: TypographyOptions = {
  // Sem `allVariants.color`: a cor do texto vem de `text.primary`, que varia
  // por esquema. Fixá-la aqui era o que impedia o tema escuro de funcionar.
  fontFamily: [
    `var(${FONT_VARIABLE})`,
    "BlinkMacSystemFont",
    '"Segoe UI"',
    "Roboto",
    '"Helvetica Neue"',
    "Arial",
    "sans-serif",
  ].join(","),
};
