// Пробный доступ без регистрации: гость получает настоящий (анонимный) аккаунт на 20 минут
// и пользуется всем, кроме комнат. Время окончания хранится в app_metadata: его ставит только сервер,
// сам гость изменить не может. Если гость создаёт аккаунт, всё, что он успел сделать, остаётся с ним.
// Длительность можно поменять на сервере переменной TRIAL_MINUTES (например, для проверки).
export const TRIAL_MINUTES = Number(process.env.TRIAL_MINUTES) || 20;
// Отметка «пробный доступ уже был» в браузере, чтобы его нельзя было начинать снова и снова.
export const TRIAL_COOKIE = "opora-trial";
// Данные гостей, которые так и не создали аккаунт, удаляются через столько часов после окончания.
export const TRIAL_KEEP_HOURS = 24;

type Claims = Record<string, unknown> | null | undefined;

export function isGuest(claims: Claims) {
  return claims?.is_anonymous === true;
}

// Когда заканчивается пробный доступ (мс). 0, если отметки нет: такого гостя считаем просроченным.
export function trialUntil(claims: Claims) {
  const meta = claims?.app_metadata as { trial_until?: string } | undefined;
  return Date.parse(meta?.trial_until ?? "") || 0;
}

export function trialOver(claims: Claims, now = Date.now()) {
  return isGuest(claims) && trialUntil(claims) <= now;
}

// Комнаты гостям закрыты: там живые люди, и за слова в комнате должен отвечать настоящий аккаунт.
export function closedForGuest(path: string) {
  return path === "/rooms" || path.startsWith("/rooms/") || path.startsWith("/api/rooms");
}
