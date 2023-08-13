import './globals.css';
import type { Metadata } from 'next';
import { Rubik } from 'next/font/google';

const rubik = Rubik({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Anime Complex',
  description: 'Anime website',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={rubik.className}>{children}</body>
    </html>
  );
};
