/** @type {import('next').NextConfig} */
const supabaseImageHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : null;

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: supabaseImageHost
      ? [
          {
            protocol: supabaseImageHost.protocol.slice(0, -1),
            hostname: supabaseImageHost.hostname,
            port: supabaseImageHost.port,
            pathname: "/storage/v1/object/public/product-images/**",
            search: "",
          },
        ]
      : [],
  },
  async rewrites() {
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/api/:path*",
          destination: "http://127.0.0.1:5000/api/:path*",
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
