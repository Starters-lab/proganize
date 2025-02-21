const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: false,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "lh3.googleusercontent.com",
      "i.pravatar.cc",
      "avatars.githubusercontent.com",
      "images.unsplash.com",
    ],
  },
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.worker\.js$/,
      loader: "worker-loader",
      options: {
        name: "static/[hash].worker.js",
        publicPath: "/_next/",
      },
    });

    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
};

module.exports = withPWA(nextConfig);
