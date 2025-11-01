import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Ignore ESLint during build (warnings won't block deploy)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "source.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "commons.wikimedia.org" },
      { protocol: "https", hostname: "seeklogo.com" },
      { protocol: "https", hostname: "logoeps.com" },
      // add your S3 bucket when presign is enabled, e.g.:
      // { protocol: "https", hostname: "your-bucket.s3.amazonaws.com" },
    ],
  },
  // Silence Turbopack root warning by pinning project root
  turbopack: { root: __dirname },
};

export default nextConfig;
