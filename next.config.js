/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    modularizeImports: {
      '@mui/icons-material': {
        transform: '@mui/icons-material/{{member}}',
      },
      // Sem isto, importar `Box` do barril arrasta o índice inteiro do
      // @mui/material para o bundle de toda rota. O transform só funciona
      // para o que tem arquivo próprio, então `alpha` e `useTheme` são
      // importados de '@mui/material/styles' e `useMediaQuery` do caminho
      // dele — mudar isso de volta para o barril quebra o build.
      '@mui/material': {
        transform: '@mui/material/{{member}}',
      },
    },
    images: {
      // O AVIF costuma sair de 20% a 30% menor que o WebP nas capas, que são
      // o grosso do que a página baixa. O Next negocia pelo Accept e cai no
      // WebP sozinho em quem não suporta.
      formats: ['image/avif', 'image/webp'],
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 's4.anilist.co',
          port: '',
          pathname: '/**',
        },
        // Imagens dos episódios (stills). Os thumbnails que vêm do AniList
        // ficam de fora de propósito: são servidos por hosts variados da
        // Crunchyroll, e o EpisodeThumb cai para <img> puro nesses casos.
        {
          protocol: 'https',
          hostname: 'image.tmdb.org',
          port: '',
          pathname: '/t/p/**',
        },
      ],
    },
}

module.exports = nextConfig
