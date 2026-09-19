'use client';
import './globals.css';

// Fonts
import { Rubik } from 'next/font/google';

// Theme
import ThemeRegistry from '@/theme/ThemeRegistry';
import { themeColor } from '@/theme';
import { getInitColorSchemeScript } from '@mui/material/styles';

// A fonte entra como variável CSS para o tema referenciá-la sem depender do
// nome de classe com hash que o Next gera a cada build. O `next/font` exige
// literais aqui, então o nome está duplicado em FONT_VARIABLE, no tema — os
// dois precisam andar juntos.
const rubik = Rubik({ subsets: ['latin'], variable: '--font-rubik' });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <title>Anime Complex</title>
        <meta name="robots" content="noindex" />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content={themeColor.light}
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content={themeColor.dark}
        />
        <link rel="icon" href="favicon.ico" type="image/x-icon" />
      </head>
      <body className={rubik.variable}>
        {/* Aplica o esquema salvo antes da hidratação — sem isso a página
            pisca no tema claro antes de trocar para o escuro. */}
        {getInitColorSchemeScript()}
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
};
