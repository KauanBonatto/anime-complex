'use client';
import './globals.css';

// Fonts
import { Rubik } from 'next/font/google';

// Theme
import { theme } from '@/customTheme';
import { ThemeProvider } from "@mui/material/styles";

const rubik = Rubik({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <html lang="pt-BR">
      <head>
        <title>Anime Complex</title>
        <meta name="robots" content="noindex" />
        <meta name="theme-color" content="#3d0240" />
        <link rel="icon" href="favicon.ico" type="image/x-icon" />
      </head>
      <body className={rubik.className}>
        <ThemeProvider theme={theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
};
