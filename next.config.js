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
      ],
    },
}

module.exports = nextConfig
