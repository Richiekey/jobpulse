/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance: compress responses
  compress: true,
  // Strict mode for catching issues
  reactStrictMode: true,
  // Disable x-powered-by header
  poweredByHeader: false,
  // Headers for security + caching
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
