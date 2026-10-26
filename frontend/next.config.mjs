/** @type {import('next').NextConfig} */
const getBackendUrl = () => {
  let url = process.env.BACKEND_URL?.trim();
  // If not configured, or accidentally pointing to frontend domain or localhost
  if (!url || url.includes("sales-intelligence-topaz.vercel.app") || (process.env.NODE_ENV === "production" && url.includes("localhost"))) {
    url = "https://mentneo-api1.vercel.app";
  }
  // Strip trailing slashes
  url = url.replace(/\/+$/, "");
  // If user included /api at the end, strip it because rewrites append /api/:path*
  if (url.endsWith("/api")) {
    url = url.slice(0, -4);
  }
  return url;
};

const nextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async rewrites() {
    const backendUrl = getBackendUrl();
    console.log(`[Next.js Rewrites] Proxying /api/:path* -> ${backendUrl}/api/:path*`);
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
