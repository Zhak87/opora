import { Nav } from "@/components/Nav";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:pl-[88px] lg:pl-[232px]">
      <Nav />
      {children}
    </div>
  );
}
