import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Seluruh halaman bergantung pada sesi login & data terbaru, jadi tidak memakai Cache Components
  experimental: {
    serverActions: {
      // Foto nota sudah dikompres di browser; batas ini hanya pengaman
      bodySizeLimit: "4mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
