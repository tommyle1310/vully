/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@vully/shared-types'],
  // Performance: Enable if needed for bundle analysis
  // eslint: {
  //   ignoreDuringBuilds: true, // TODO: Fix linting errors
  // },
  // typescript: {
  //   ignoreBuildErrors: true, // TODO: Fix TypeScript errors
  // },
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
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/v1/:path*',
      },
    ];
  },
  // Disabled typedRoutes temporarily until all routes are properly defined
  // experimental: {
  //   typedRoutes: true,
  // },
};

module.exports = nextConfig;
