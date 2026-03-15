/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['cheerio'],
};

module.exports = nextConfig;
