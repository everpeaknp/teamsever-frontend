/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    optimizePackageImports: [
      'lucide-react', 
      'lodash', 
      '@radix-ui/react-icons', 
      '@radix-ui/react-avatar',
      '@radix-ui/react-select',
      'framer-motion'
    ],
  },
}

module.exports = nextConfig
