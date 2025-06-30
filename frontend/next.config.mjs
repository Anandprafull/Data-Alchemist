/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Configure for production deployment
  output: 'standalone',
  // Ensure proper port handling
  experimental: {
    serverComponentsExternalPackages: []
  }
}

export default nextConfig
