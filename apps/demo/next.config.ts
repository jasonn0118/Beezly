import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      'i.pravatar.cc',
      'placehold.co'
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
