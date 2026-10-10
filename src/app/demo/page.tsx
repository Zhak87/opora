import type { Metadata } from "next";
import { DemoChat } from "@/components/DemoChat";
import { getMsg } from "@/i18n/server";
import { demoMessages } from "@/i18n/demo";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMsg(demoMessages)).metaTitle };
}

export default function DemoPage() {
  return <DemoChat />;
}
