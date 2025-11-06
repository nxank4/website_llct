import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Turbopack configuration (Next.js 15.3+ / 16)
  // Chỉ dùng các tuỳ chọn an toàn, không thêm loader lạ để tránh lỗi
  turbopack: {
    // Giữ danh sách extensions mặc định + mdx nếu có dùng
    resolveExtensions: [
      ".mdx",
      ".tsx",
      ".ts",
      ".jsx",
      ".js",
      ".mjs",
      ".json",
    ],
    // Có thể bật debugIds khi cần debug bundle (mặc định tắt)
    // debugIds: process.env.NODE_ENV !== "production",
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Disable static page generation for all pages (they will be rendered on-demand)
  output: 'standalone',
  // Force all pages to be dynamic (no static generation)
  // This prevents prerender errors with client components and event handlers
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
  // Allow external packages to be resolved dynamically
  webpack: (config, { isServer }) => {
    // Don't resolve @auth/supabase-adapter during build if it's conditionally loaded
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@auth/supabase-adapter': false,
      };
    }
    return config;
  },
};

export default nextConfig;
