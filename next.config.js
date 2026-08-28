/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    modularizeImports: {
      '@mui/icons-material': {
        transform: '@mui/icons-material/{{member}}',
      },
    },
    images: {
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
