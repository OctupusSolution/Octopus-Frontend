/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@octopus/api-client", "@octopus/ui", "@octopus/i18n"],
};

export default nextConfig;
