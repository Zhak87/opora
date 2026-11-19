import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { OG_IMAGE } from "@/lib/og";
import { MusicProvider } from "@/components/Music";
import { LocaleProvider } from "@/i18n/client";
import { getLocale } from "@/i18n/server";
import { common } from "@/i18n/common";
import { TimezoneCookie } from "@/components/TimezoneCookie";
import { savedTimeZone } from "@/lib/tz";
import { siteUrl } from "@/lib/seo";

// Основной текст — Onest, заголовки — округлый Unbounded. Оба с казахскими буквами (cyrillic-ext).
const onest = localFont({ src: "./fonts/onest.woff2", variable: "--font-onest", weight: "100 900" });
const unbounded = localFont({ src: "./fonts/unbounded.woff2", variable: "--font-unbounded", weight: "200 900", adjustFontFallback: false });

export async function generateMetadata(): Promise<Metadata> {
  const m = common[await getLocale()];
  return {
    metadataBase: siteUrl,
    title: m.metaTitle,
    description: m.metaDescription,
    openGraph: { type: "website", siteName: m.brand, title: m.metaTitle, description: m.metaDescription, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", images: [OG_IMAGE.url] },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
      yandex: process.env.YANDEX_SITE_VERIFICATION || undefined,
    },
    appleWebApp: { title: m.brand, statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  themeColor: "#f3f4f8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const tz = await savedTimeZone();
  return (
    <html lang={locale}>
      <body className={`${onest.variable} ${unbounded.variable} ambient min-h-dvh`}>
        <LocaleProvider locale={locale}>
          <MusicProvider>{children}</MusicProvider>
          <TimezoneCookie current={tz} />
        </LocaleProvider>
      </body>
    </html>
  );
}
