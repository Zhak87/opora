import { Orb } from "@/components/Orb";
import { ButtonLink } from "@/components/ui";
import { getMsg } from "@/i18n/server";
import { welcomeMessages } from "@/i18n/welcome";

export default async function NotFound() {
  const m = await getMsg(welcomeMessages);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Orb size={110} />
      <h1 className="mt-8 font-serif text-[28px] text-ink">{m.notFoundTitle}</h1>
      <p className="mt-2 text-ink-soft">{m.notFoundText}</p>
      <ButtonLink href="/" className="mt-8">{m.toHome}</ButtonLink>
    </div>
  );
}
