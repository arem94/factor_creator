/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // jsPDF به صورت اختیاری از canvg برای خروجی SVG استفاده می‌کند؛ ما به آن نیازی نداریم.
    config.resolve.alias = {
      ...config.resolve.alias,
      canvg: false,
    };
    return config;
  },
};

export default nextConfig;
