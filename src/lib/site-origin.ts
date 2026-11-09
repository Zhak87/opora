// Адрес сайта для ссылок и переадресаций. За Caddy сам Next.js видит только свой внутренний
// адрес (0.0.0.0:3000), поэтому берём NEXT_PUBLIC_SITE_URL, а без него — заголовки прокси.
export function siteOrigin(headers: Headers) {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";
  const proto = headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
