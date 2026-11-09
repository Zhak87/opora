import { Nav } from "@/components/Nav";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:pl-[100px] lg:pl-[244px]">
      <Nav />
      {children}
    </div>
  );
}
