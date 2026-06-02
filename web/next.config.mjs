/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Import Convex from repo root (../convex)
  experimental: {
    externalDir: true,
  },
  transpilePackages: ["convex"],
  webpack: (config) => {
    config.module.rules.push({
      test: /[\\/]convex[\\/]_generated[\\/].*\.js$/,
      type: "javascript/auto",
      resolve: {
        fullySpecified: false,
      },
    });
    return config;
  },
};

export default nextConfig;
