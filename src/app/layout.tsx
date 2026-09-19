'use client';
import './globals.css';

// Fonts
import { Rubik } from 'next/font/google';

// Theme
import ThemeRegistry from '@/theme/ThemeRegistry';
import { GenreFilterProvider } from '@/contexts/GenreFilterContext';
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
        {/* O app abre sempre no claro, então a barra do navegador usa a cor
            dele. Ela não acompanha uma troca manual para o escuro — só
            aparece no celular, e corrigir exigiria mexer na tag por JS. */}
        <meta name="theme-color" content={themeColor.light} />
        <link rel="icon" href="favicon.ico" type="image/x-icon" />
      </head>
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
        {getInitColorSchemeScript()}
        {/* O filtro de gênero fica no cabeçalho, que é irmão das telas: o
            estado precisa nascer acima dos dois. */}
        <ThemeRegistry>
          <GenreFilterProvider>{children}</GenreFilterProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
};
