import Link from "next/link";
import { BackIcon } from "../icons";
import { getMsg } from "@/i18n/server";
import { gamesMessages } from "@/i18n/games";

export async function GameShell({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  const m = await getMsg(gamesMessages);
  return (
    <div className="animate-fade">
      <Link href="/play" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {m.shell.back}
      </Link>
      <h1 className="font-serif text-[30px] leading-tight text-ink sm:text-[36px]">{title}</h1>
      <p className="mt-2 text-[15px] text-ink-soft">{hint}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}
