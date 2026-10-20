// Только адрес внутри сайта: «//evil.com» и «/\evil.com» браузер понял бы как другой сайт.
export function safeNext(value: string | null | undefined) {
  if (!value || !/^\/(?![\/\\])/.test(value) || /[\u0000-\u001f]/.test(value)) return "/";
  return value;
}
