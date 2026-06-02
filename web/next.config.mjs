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
  // Payment pages use useSearchParams inside client-only dynamic imports.
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

export default nextConfig;
