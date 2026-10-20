import Link from "next/link";
import { Orb } from "../Orb";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { getMsg } from "@/i18n/server";
import { common } from "@/i18n/common";

// Оформление открытых страниц специалиста: профиль и приглашение.
export async function PublicShell({ home, wide = false, children }: { home: string; wide?: boolean; children: React.ReactNode }) {
  const c = await getMsg(common);
  return (
    <div className="min-h-dvh">
      <header className={`mx-auto flex w-full ${wide ? "max-w-6xl" : "max-w-4xl"} items-center justify-between px-5 py-6 sm:px-8`}>
        <Link href={home} className="flex items-center gap-3">
          <Orb size={32} still />
          <span className="font-serif text-xl text-ink">{c.brand}</span>
        </Link>
        <LanguageSwitcher />
      </header>
      <main className={`mx-auto w-full ${wide ? "max-w-6xl" : "max-w-4xl"} px-5 pb-20 pt-2 sm:px-8 sm:pt-6`}>{children}</main>
    </div>
  );
}
