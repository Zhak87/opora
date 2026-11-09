import type { Metadata, Viewport } from "next";
import { Onest, Unbounded } from "next/font/google";
import "./globals.css";
import { OG_IMAGE } from "@/lib/og";
import { MusicProvider } from "@/components/Music";
import { LocaleProvider } from "@/i18n/client";
import { getLocale } from "@/i18n/server";
import { common } from "@/i18n/common";
import { TimezoneCookie } from "@/components/TimezoneCookie";
import { savedTimeZone } from "@/lib/tz";

// Основной текст — Onest, заголовки — округлый Unbounded. Оба с казахскими буквами (cyrillic-ext).
const onest = Onest({ variable: "--font-onest", subsets: ["latin", "cyrillic", "cyrillic-ext"] });
const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin", "cyrillic", "cyrillic-ext"], weight: ["400", "500", "600"] });

export async function generateMetadata(): Promise<Metadata> {
  const m = common[await getLocale()];
  // Абсолютные адреса для превью ссылок в WhatsApp и Telegram строятся от адреса сайта.
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return {
    metadataBase: new URL(site),
    title: m.metaTitle,
    description: m.metaDescription,
    openGraph: { type: "website", siteName: m.brand, title: m.metaTitle, description: m.metaDescription, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image" },
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
