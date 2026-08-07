/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/validators", "@repo/utils", "@repo/db", "@repo/email"],
  async headers() {
    const headers = [{ source: "/:path*", headers: securityHeaders }];
    if (process.env.NODE_ENV === "production") {
      headers[0].headers.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" });
    }
    return headers;
  },
};

export default nextConfig;
