/**
 * Fonte única da paleta do app.
 *
 * Para ajustar as cores, é aqui — e só aqui. A rampa `brandPurple` é a
 * identidade da marca; os dois esquemas abaixo (claro e escuro) derivam dela.
 * Nada mais no código deve conter um literal de cor.
 */

/**
 * Rampa roxa da marca. O 500 é o roxo histórico do Anime Complex — a cor da
 * navbar, do rodapé e do favicon.
 */
export const brandPurple = {
  50: "#ece6ec",
  100: "#c3b1c4",
  200: "#a68ba7",
  300: "#7d557f",
  400: "#643566",
  500: "#3d0240",
  600: "#38023a",
  700: "#2b012d",
  800: "#220123",
  900: "#1a011b",
};

/** Preto-roxo da marca: base dos scrims e do fundo no tema escuro. */
const INK = "#0e000f";

/**
 * Converte `#rrggbb` em "r g b", o formato que o CSS espera dentro de
 * `rgba(... / alpha)`. O MUI gera esses canais sozinho para as chaves que ele
 * conhece, mas não para as customizadas abaixo — derivar aqui evita que o
 * canal saia do lugar quando alguém ajustar o hex.
 */
const channel = (hex: string) => {
  const value = parseInt(hex.slice(1), 16);
  return `${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255}`;
};

/**
 * Cores que não pertencem à marca e por isso não variam entre os temas:
 * `crunchyroll` é a cor oficial do serviço e `scrim` cobre pôsteres, que são
 * escuros em qualquer esquema.
 */
const fixed = {
  scrim: INK,
  crunchyroll: "#f47521",
} as const;

declare module "@mui/material/styles" {
  /**
   * Cores de chrome (navbar, rodapé, backdrop do hero) e de terceiros.
   *
   * Existe separado de `primary` porque os dois papéis divergem no tema
   * escuro: o acento precisa clarear para ter contraste sobre a superfície,
   * enquanto o chrome precisa escurecer. Antes ambos saíam de `primary.main`.
   */
  interface BrandPalette {
    /** Fundo da navbar, do rodapé e do backdrop do hero. */
    chrome: string;
    /** Texto e ícones sobre o chrome. */
    chromeContrast: string;
    /** Base das sobreposições sobre pôsteres e thumbnails. */
    scrim: string;
    /** Links de atribuição no rodapé. */
    link: string;
    /** Cor de marca da Crunchyroll. */
    crunchyroll: string;
    /** `chrome` como "r g b", para uso translúcido via variável CSS. */
    chromeChannel: string;
    /** `chromeContrast` como "r g b". */
    chromeContrastChannel: string;
  }

  /** Escala de cor da nota, do melhor para o pior. */
  interface ScorePalette {
    high: string;
    good: string;
    mid: string;
    low: string;
  }

  interface Palette {
    brand: BrandPalette;
    score: ScorePalette;
  }

  interface PaletteOptions {
    brand?: Partial<BrandPalette>;
    score?: Partial<ScorePalette>;
  }
}

/**
 * Tema claro — preserva o visual histórico do app: chrome roxo com a área de
 * conteúdo clara.
 */
export const lightPalette = {
  primary: {
    ...brandPurple,
    main: brandPurple[500],
    light: brandPurple[300],
    dark: brandPurple[700],
    contrastText: "#ffffff",
  },
  background: {
    // O roxo que aparece quando o scroll ultrapassa o topo ou o fim da página.
    default: brandPurple[500],
    paper: "#e6e6e6",
  },
  text: {
    primary: INK,
    secondary: "#5a4a5b",
    // Definido explicitamente porque o app o usa como "texto atenuado", e não
    // como estado desabilitado — o padrão do MUI (0.38) fica ilegível nesse uso.
    disabled: "rgba(14, 0, 15, 0.55)",
  },
  divider: "rgba(14, 0, 15, 0.12)",
  common: { black: INK, white: "#ffffff" },
  brand: {
    ...fixed,
    chrome: brandPurple[500],
    chromeChannel: channel(brandPurple[500]),
    chromeContrast: "#ffffff",
    chromeContrastChannel: channel("#ffffff"),
    link: "#2196f3",
  },
  score: {
    high: "#2e9e5b",
    good: "#e0a01e",
    mid: "#d97706",
    low: "#c0392b",
  },
};

/**
 * Tema escuro — mantém o roxo como chrome, mas escurecido, e clareia o acento
 * para que botões e progresso continuem visíveis sobre a superfície escura.
 */
export const darkPalette = {
  primary: {
    ...brandPurple,
    main: brandPurple[200],
    light: brandPurple[100],
    dark: brandPurple[300],
    contrastText: brandPurple[900],
  },
  background: {
    default: INK,
    paper: "#1b0d1c",
  },
  text: {
    primary: "#f2ecf2",
    secondary: brandPurple[100],
    disabled: "rgba(236, 230, 236, 0.6)",
  },
  divider: "rgba(236, 230, 236, 0.14)",
  common: { black: INK, white: "#ffffff" },
  brand: {
    ...fixed,
    chrome: brandPurple[800],
    chromeChannel: channel(brandPurple[800]),
    chromeContrast: "#ffffff",
    chromeContrastChannel: channel("#ffffff"),
    link: "#64b5f6",
  },
  // Clareadas em relação ao tema claro para manter contraste sobre o papel escuro.
  score: {
    high: "#3fbf74",
    good: "#efb939",
    mid: "#f59e0b",
    low: "#e05a4a",
  },
};

/** Cor da barra do navegador por esquema, consumida pelo layout. */
export const themeColor = {
  light: lightPalette.background.default,
  dark: darkPalette.background.default,
};
