import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { getMsg } from "@/i18n/server";
import { legalMessages } from "@/i18n/legal";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMsg(legalMessages)).privacyTitle };
}

export default function PrivacyPage() {
  return <LegalPage kind="privacy" />;
}
