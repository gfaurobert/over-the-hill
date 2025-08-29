/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0'
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/'
          }
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'development' 
              ? "default-src 'self' http: https: data: blob: 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval';"
              : "default-src 'self' http: https: data: blob: 'unsafe-inline'; script-src 'self' 'unsafe-inline';"
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
          }
        ],
      },
    ];
  },
  webpack: (config, { dev, isServer }) => {
    // Optimize webpack cache to reduce large string serialization warnings
    if (!dev) {
      config.cache = {
        ...config.cache,
        compression: 'gzip',
        maxMemoryGenerations: 1,
      };
    }
    
    // Optimize chunk splitting for large components
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          largeComponents: {
            name: 'large-components',
            chunks: 'all',
            test: /[\\/]components[\\/]HillChartApp\.tsx$/,
            priority: 20,
            minSize: 50000,
          },
        },
      },
    };

    return config;
  },
}

export default nextConfig
