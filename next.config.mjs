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
  output: 'export',
  trailingSlash: true,
  distDir: 'out',
  assetPrefix: './',
  basePath: '',
  // Exclude build directories from file watching to prevent constant recompilation
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ignored: [
          '**/node_modules/**',
          '**/.next/**',
          '**/out/**',
          '**/dist/**',
          '**/build/**',
          '**/.git/**'
        ]
      }
    }
    return config
  }
}

export default nextConfig
