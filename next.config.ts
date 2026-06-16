import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['127.0.0.1', 'localhost', '26.33.52.38'],
  experimental: {
    serverActions: {
      allowedOrigins: ['127.0.0.1:3000', 'localhost:3000', '26.33.52.38:3000'],
    },
  },
};

export default nextConfig;
