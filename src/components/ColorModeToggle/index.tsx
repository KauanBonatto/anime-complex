"use client";

import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import { IconButton, Tooltip } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import { useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";

/** Ciclo do botão: o modo atual leva ao próximo. */
const NEXT: Record<Mode, Mode> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const LABEL: Record<Mode, string> = {
  light: "Tema claro",
  dark: "Tema escuro",
  system: "Tema do sistema",
};

const ICON: Record<Mode, typeof LightModeIcon> = {
  light: LightModeIcon,
  dark: DarkModeIcon,
  system: SettingsBrightnessIcon,
};

const ColorModeToggle = () => {
  const { mode, setMode } = useColorScheme();

  /**
   * O modo só é conhecido no cliente — no servidor não há como saber a
   * preferência do sistema nem ler o localStorage. Renderizar um placeholder
   * até montar evita divergência de hidratação; o espaço é reservado para a
   * navbar não pular quando o botão aparece.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <IconButton disabled aria-hidden sx={{ visibility: "hidden" }} />;
  }

  const current = (mode ?? "system") as Mode;
  const next = NEXT[current];
  const Icon = ICON[current];

  return (
    <Tooltip title={`${LABEL[current]} — trocar para ${LABEL[next].toLowerCase()}`}>
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
