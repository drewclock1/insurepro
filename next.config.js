/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tell Next.js these packages are server-only and should never be bundled for client
  experimental: {
    serverComponentsExternalPackages: ['twilio', 'openai', 'googleapis', 'nodemailer'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  // Silence the "Critical dependency" warnings from twilio/openai in webpack
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        http2: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
