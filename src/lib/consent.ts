// Согласие на обработку персональных данных. Хранится в метаданных пользователя Supabase
// (видно в панели Supabase → Authentication → Users) и попадает в токен входа,
// поэтому проверка не требует отдельного запроса к базе.
// При существенном изменении политики поменяйте версию: все подтвердят согласие заново.
export const CONSENT_VERSION = "2026-10-10";

export type ConsentRecord = { version: string; at: string; locale: string };

export function consentRecord(locale: string): ConsentRecord {
  return { version: CONSENT_VERSION, at: new Date().toISOString(), locale };
}

export function hasConsent(claims: Record<string, unknown> | null | undefined) {
  const meta = claims?.user_metadata as { consent?: ConsentRecord } | undefined;
  return meta?.consent?.version === CONSENT_VERSION;
}

// Кто оператор данных и как с ним связаться: задаётся в настройках сервера.
export function legalContacts(defaults: { operator: string; contact: string }) {
  return {
    operator: process.env.OPORA_OPERATOR?.trim() || defaults.operator,
    contact: process.env.OPORA_CONTACT_EMAIL?.trim() || defaults.contact,
  };
}
