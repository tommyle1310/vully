/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@vully/shared-types'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  // Disabled typedRoutes temporarily until all routes are properly defined
  // experimental: {
  //   typedRoutes: true,
  // },
};

module.exports = nextConfig;
