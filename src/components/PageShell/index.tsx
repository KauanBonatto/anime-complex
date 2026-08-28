"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Box, Card, LinearProgress } from "@mui/material";
import type { ReactNode } from "react";
import { NAVBAR_HEIGHT } from "./height";

export { NAVBAR_HEIGHT } from "./height";

/** Largura máxima do conteúdo: acima disso a grade viraria uma faixa esticada. */
const CONTENT_MAX_WIDTH = 1440;

interface PageShellProps {
  children: ReactNode;
  /** Mostra a barra de progresso fixa no topo. */
  loading?: boolean;
  /** Centraliza o conteúdo na vertical — usado pela página de erro. */
  centered?: boolean;
  maxWidth?: number;
}

/**
 * Moldura de todas as páginas: progresso, navbar, superfície de conteúdo e
 * rodapé. Existe porque esse bloco estava copiado em todas as telas, cada uma
 * repetindo o mesmo cálculo de altura e o mesmo padding fixo.
 */
const PageShell = ({
  children,
  loading = false,
  centered = false,
  maxWidth = CONTENT_MAX_WIDTH,
}: PageShellProps) => (
  <Box width="100%">
    {loading && (
      <LinearProgress
        color="primary"
        sx={{
          width: "100%",
          position: "fixed",
          top: 0,
          // Acima da navbar, que agora é fixa e passaria por cima da barra.
          zIndex: (theme) => theme.zIndex.appBar + 1,
        }}
      />
    )}

    <Navbar />

    <Card
      sx={{
        minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
        borderRadius: 0,
        // O Card do MUI vem com overflow: hidden, o que faz dele o ancestral
        // rolável mais próximo de tudo que está dentro — e um `position:
        // sticky` passa a ser calculado contra um contêiner que nunca rola,
        // saindo do lugar. Nada aqui precisa de recorte.
        overflow: "visible",
        px: { xs: 2, sm: 3, md: 5 },
        py: { xs: 3, md: 5 },
        ...(centered && { display: "flex", flexDirection: "column" }),
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth,
          mx: "auto",
          ...(centered && {
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
          }),
        }}
      >
        {children}
      </Box>
    </Card>

    <Footer />
  </Box>
);

export default PageShell;
