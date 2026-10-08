import Link from "next/link";
import { Orb } from "@/components/Orb";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
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
