import { Nav } from "@/components/Nav";
import { MusicToggle } from "@/components/Music";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:pl-[88px] lg:pl-[232px]">
      <Nav />
      <div className="fixed right-4 top-4 z-30 pt-[env(safe-area-inset-top)] md:hidden">
        <MusicToggle />
      </div>
      <main className="mx-auto w-full max-w-3xl px-5 pb-32 pt-8 sm:px-8 sm:pt-12 md:pb-16">{children}</main>
    </div>
  );
}
