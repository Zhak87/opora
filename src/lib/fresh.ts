// После выкладки новой версии сайта уже открытая страница вызывает серверные действия старой сборки,
// которых на сервере больше нет, и каждый вызов падает. Проверяем номер сборки и, если сайт обновился,
// перезагружаем страницу (перед этим сохраняем то, что человек не успел отправить).
let checking: Promise<boolean> | null = null;

export function reloadIfStale(save?: () => void): Promise<boolean> {
  checking ??= fetch("/api/version", { cache: "no-store" })
    .then((r) => r.json() as Promise<{ build?: string }>)
    .then(({ build }) => {
      if (!build || build === process.env.NEXT_PUBLIC_BUILD_ID) return false;
      save?.();
      window.location.reload();
      return true;
    })
    .catch(() => false)
    .finally(() => setTimeout(() => (checking = null), 5000));
  return checking;
}
