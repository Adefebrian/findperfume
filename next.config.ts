import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.parfumo.com" },
      { protocol: "https", hostname: "images.parfumo.de" },
      { protocol: "https", hostname: "media.parfumo.de" },
    ],
  },
  // libSQL native client must stay external (not bundled) in server runtime
  serverExternalPackages: ["@libsql/client", "libsql"],
};

export default nextConfig;
