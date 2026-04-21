/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "steamcdn-a.akamaihd.net", pathname: "**" },
      { protocol: "https", hostname: "cdn.akamai.steamstatic.com", pathname: "**" },
      { protocol: "https", hostname: "media.steampowered.com", pathname: "**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "**" },
      { protocol: "https", hostname: "avatars.steamstatic.com", pathname: "**" },
      { protocol: "https", hostname: "avatars.akamai.steamstatic.com", pathname: "**" },
    ],
  },
};

export default nextConfig;
