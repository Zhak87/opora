import type { NextConfig } from "next";

// Заголовки безопасности для всех страниц: сайт нельзя встроить в чужую страницу,
// браузер не угадывает тип файлов, адрес страницы не уходит на другие сайты,
// а микрофон доступен только самому приложению (для голосового режима).
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(), payment=(), usb=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Уже открытые разделы показываются из кэша браузера мгновенно, данные обновляются после изменений.
    staleTimes: { dynamic: 30, static: 180 },
    // По умолчанию Next.js принимает в действиях не больше 1 МБ: документы психолога крупнее. Vercel сам не пропускает больше 4,5 МБ.
    serverActions: { bodySizeLimit: "4mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
