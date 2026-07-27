/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // Cloudflare Pages doesn't support Next's built-in image optimizer
  },
};

module.exports = nextConfig;
