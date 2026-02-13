/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  turbopack: {},
  images: {
    unoptimized: true,
  },
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') return []

    // Proxy local Supabase endpoints through Next.js during development.
    // This avoids browser loopback issues in remote dev / SSH port-forwarding setups.
    // Must target the Supabase API port (54321), not the Next.js app port (3001).
    const apiPort = process.env.API_PORT || '54321'
    const localSupabase = `http://127.0.0.1:${apiPort}`

    return [
      { source: '/auth/v1/:path*', destination: `${localSupabase}/auth/v1/:path*` },
      { source: '/rest/v1/:path*', destination: `${localSupabase}/rest/v1/:path*` },
      { source: '/graphql/v1/:path*', destination: `${localSupabase}/graphql/v1/:path*` },
      { source: '/realtime/v1/:path*', destination: `${localSupabase}/realtime/v1/:path*` },
      { source: '/storage/v1/:path*', destination: `${localSupabase}/storage/v1/:path*` },
      { source: '/functions/v1/:path*', destination: `${localSupabase}/functions/v1/:path*` },
    ]
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
