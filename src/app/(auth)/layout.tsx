import Link from "next/link";
import { Orb } from "@/components/Orb";
import { MusicToggle } from "@/components/Music";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <MusicToggle />
      </div>
      <Link href="/welcome" className="mb-8 flex flex-col items-center gap-4 animate-fade">
        <Orb size={88} />
        <span className="font-serif text-2xl text-ink">Опора</span>
      </Link>
      <div className="w-full max-w-[400px] animate-rise rounded-[32px] border border-line/70 bg-paper/85 p-7 shadow-lift backdrop-blur sm:p-9">
        {children}
      </div>
    </div>
  );
}
