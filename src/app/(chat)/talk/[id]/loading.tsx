import { Orb } from "@/components/Orb";

export default function Loading() {
  return (
    <div className="flex h-dvh items-center justify-center" aria-busy="true" aria-label="Загрузка">
      <Orb size={96} />
    </div>
  );
}
