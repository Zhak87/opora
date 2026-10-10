import { getMsg } from "@/i18n/server";
import { welcomeMessages } from "@/i18n/welcome";
import { Orb } from "@/components/Orb";

export default async function Loading() {
  const m = await getMsg(welcomeMessages);
  return (
    <div className="flex h-dvh items-center justify-center" aria-busy="true" aria-label={m.loading}>
      <Orb size={96} />
    </div>
  );
}
