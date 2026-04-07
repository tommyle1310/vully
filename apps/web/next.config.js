/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Thêm dòng này để tắt cái icon build ở góc màn hình
  devIndicators: {
    buildActivity: false,
  },
  transpilePackages: ['@vully/shared-types'],
  // ... các phần còn lại giữ nguyên
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
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
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
};

module.exports = nextConfig;
