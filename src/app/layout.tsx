import type { Metadata, Viewport } from "next";
import { Manrope, Lora } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin", "cyrillic"] });
const lora = Lora({ variable: "--font-lora", subsets: ["latin", "cyrillic"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Опора — место, где можно остановиться",
  description: "Спокойное пространство, чтобы выговориться, разобраться в себе и найти внутреннюю опору.",
  appleWebApp: { title: "Опора", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={`${manrope.variable} ${lora.variable} ambient min-h-dvh`}>{children}</body>
    </html>
  );
}
