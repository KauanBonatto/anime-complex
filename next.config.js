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
          hostname: 'gogocdn.net',
          port: '',
          pathname: '/**',
        },
      ],
    },
}

module.exports = nextConfig
