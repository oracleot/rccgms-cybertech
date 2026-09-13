import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The display used to live at two URLs that rendered differently; one canonical URL now.
      { source: "/bible/obs/scene", destination: "/bible/obs", permanent: true },
    ];
  },
};

export default nextConfig;
