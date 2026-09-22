import './globals.css';

// Fonts
import { Rubik } from 'next/font/google';

// Theme
import ThemeRegistry from '@/theme/ThemeRegistry';
import { GenreFilterProvider } from '@/contexts/GenreFilterContext';
// Direto do módulo da paleta, e não do índice do tema: o índice chama
// `extendTheme`, que é uma função de cliente, e importá-lo aqui derrubava o
// build do layout renderizado no servidor.
import { themeColor } from '@/theme/palette';
import InitColorScheme from '@/theme/InitColorScheme';

// Chrome
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

import type { Metadata } from 'next';

// A fonte entra como variável CSS para o tema referenciá-la sem depender do
// nome de classe com hash que o Next gera a cada build. O `next/font` exige
// literais aqui, então o nome está duplicado em FONT_VARIABLE, no tema — os
// dois precisam andar juntos.
const rubik = Rubik({ subsets: ['latin'], variable: '--font-rubik' });

/**
 * O layout deixou de ser `'use client'`. Enquanto era, a árvore inteira caía
 * no cliente e o Next não aceitava `metadata` — o título e as metatags eram
 * escritos à mão dentro de um `<head>`. Agora o casco vai renderizado do
 * servidor e as telas continuam client components, cada uma por si.
 */
export const metadata: Metadata = {
  title: 'Anime Complex',
  robots: { index: false, follow: false },
  themeColor: themeColor.light,
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={rubik.variable}>
        {/* Migração das versões que ofereciam "seguir o sistema": sem isso o
            valor antigo continuaria mandando, e quem estivesse com o SO no
            escuro nunca veria o padrão claro. Roda antes do script do MUI
            para não haver piscada, e pode sair quando ninguém mais tiver
            esse valor guardado. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('mui-mode')==='system')localStorage.setItem('mui-mode','light')}catch(e){}",
          }}
        />
        {/* Aplica o esquema salvo antes da hidratação — sem isso a página
            pisca no tema claro antes de trocar para o escuro. */}
        <InitColorScheme />
        {/* O filtro de gênero fica no cabeçalho, que é irmão das telas: o
            estado precisa nascer acima dos dois.

            A navbar e o rodapé também moram aqui, e não no PageShell: acima
            da fronteira de rota eles atravessam a navegação sem remontar — o
            cabeçalho não pisca, o termo digitado na busca continua lá e o
            painel de gêneros não se reconstrói a cada troca de página. */}
        <ThemeRegistry>
          <GenreFilterProvider>
            <Navbar />
            {children}
            <Footer />
          </GenreFilterProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
};
