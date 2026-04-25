/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Backend REST API'sine proxy — geliştirme ve üretimde aynı alan adından erişim sağlar
  async rewrites() {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:1881"
    return [
      {
        source: "/api/telemetry",
        destination: `${serverUrl}/api/telemetry`,
      },
      {
        source: "/api/server-time",
        destination: `${serverUrl}/api/server-time`,
      },
    ]
  },
}

export default nextConfig
