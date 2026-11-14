import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { TrialBadge } from "@/components/trial/TrialBadge";
import { isGuest, trialUntil } from "@/lib/trial";

export const metadata = { robots: { index: false } };

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const { data } = await (await createClient()).auth.getClaims();
  const guest = isGuest(data?.claims);
  return (
    <div className="md:pl-[100px] lg:pl-[244px]" data-chat-guest={guest || undefined}>
      {guest && <TrialBadge until={trialUntil(data?.claims)} />}
      <Nav />
      {children}
    </div>
  );
}
