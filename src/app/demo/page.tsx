import type { Metadata } from "next";
import { DemoChat } from "@/components/DemoChat";

export const metadata: Metadata = { title: "Попробовать — Опора" };

export default function DemoPage() {
  return <DemoChat />;
}
