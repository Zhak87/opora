import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Уже открытые разделы показываются из кэша браузера мгновенно, данные обновляются после изменений.
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
