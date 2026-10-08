import { Orb } from "@/components/Orb";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Orb size={110} />
      <h1 className="mt-8 font-serif text-[28px] text-ink">Здесь ничего нет</h1>
      <p className="mt-2 text-ink-soft">Возможно, страница была удалена. Ничего страшного.</p>
      <ButtonLink href="/" className="mt-8">На главную</ButtonLink>
    </div>
  );
}
