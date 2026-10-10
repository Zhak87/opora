import Link from "next/link";
import { Orb } from "@/components/Orb";
import { MusicToggle } from "@/components/Music";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getMsg } from "@/i18n/server";
import { common } from "@/i18n/common";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const m = await getMsg(common);
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="absolute right-4 top-4 flex items-center gap-2 sm:right-6 sm:top-6">
        <LanguageSwitcher />
        <MusicToggle />
      </div>
      <Link href="/welcome" className="mb-8 mt-6 flex flex-col items-center gap-4 animate-fade sm:mt-0">
        <Orb size={88} />
        <span className="font-serif text-2xl text-ink">{m.brand}</span>
      </Link>
      <div className="w-full max-w-[400px] animate-rise rounded-[32px] border border-line/70 bg-paper/85 p-7 shadow-lift backdrop-blur sm:p-9">
        {children}
      </div>
    </div>
  );
}
