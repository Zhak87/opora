import type { Metadata, Viewport } from "next";
import { Manrope, Lora } from "next/font/google";
import "./globals.css";
import { MusicProvider } from "@/components/Music";
import { LocaleProvider } from "@/i18n/client";
import { getLocale } from "@/i18n/server";
import { common } from "@/i18n/common";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin", "cyrillic"] });
const lora = Lora({ variable: "--font-lora", subsets: ["latin", "cyrillic"], style: ["normal", "italic"] });

export async function generateMetadata(): Promise<Metadata> {
  const m = common[await getLocale()];
  return {
    title: m.metaTitle,
    description: m.metaDescription,
    appleWebApp: { title: m.brand, statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  themeColor: "#fbf8f3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className={`${manrope.variable} ${lora.variable} ambient min-h-dvh`}>
        <LocaleProvider locale={locale}>
          <MusicProvider>{children}</MusicProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
