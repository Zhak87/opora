import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { fromAcceptLanguage } from "@/i18n/config";
import { common } from "@/i18n/common";
import { welcomeMessages } from "@/i18n/welcome";

// Манифест запрашивается браузером без учёта выбора в приложении, поэтому язык берём из Accept-Language.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const locale = fromAcceptLanguage((await headers()).get("accept-language"));
  return {
    name: common[locale].brand,
    short_name: common[locale].brand,
    description: welcomeMessages[locale].manifestDescription,
    lang: locale,
    start_url: "/",
    display: "standalone",
    background_color: "#fbf8f3",
    theme_color: "#fbf8f3",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
