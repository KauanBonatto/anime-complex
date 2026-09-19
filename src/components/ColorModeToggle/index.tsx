"use client";

import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { IconButton, Tooltip } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import { useEffect, useState } from "react";

type Mode = "light" | "dark";

const LABEL: Record<Mode, string> = {
  light: "Tema claro",
  dark: "Tema escuro",
};

const ICON: Record<Mode, typeof LightModeIcon> = {
  light: LightModeIcon,
  dark: DarkModeIcon,
};

const ColorModeToggle = () => {
  const { mode, setMode } = useColorScheme();

  /**
   * O modo só é conhecido no cliente — no servidor não há como ler o
   * localStorage. Renderizar um placeholder até montar evita divergência de
   * hidratação; o espaço é reservado para a navbar não pular quando o botão
   * aparece.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <IconButton disabled aria-hidden sx={{ visibility: "hidden" }} />;
  }

  // São só dois modos. Qualquer outro valor — o "system" que as versões
  // anteriores gravavam — cai no claro, que é o padrão.
  const current: Mode = mode === "dark" ? "dark" : "light";
  const next: Mode = current === "light" ? "dark" : "light";
  const Icon = ICON[current];

  return (
    <Tooltip
      title={`${LABEL[current]} — trocar para ${LABEL[next].toLowerCase()}`}
    >
      <IconButton
        onClick={() => setMode(next)}
        aria-label={`${LABEL[current]}. Trocar para ${LABEL[next].toLowerCase()}`}
        sx={{ color: "brand.chromeContrast", flexShrink: 0 }}
      >
        <Icon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

export default ColorModeToggle;
