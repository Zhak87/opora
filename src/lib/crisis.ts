// Признаки угрозы жизни в тексте. Отдельный файл, чтобы проверку можно было делать и в браузере
// (в практиках), не утягивая туда инструкции для ИИ.
const RISK_PATTERNS = [
  /суицид|suicid/i,
  /покончить с собой/i,
  /убить себя/i,
  /не хочу жить/i,
  /не хочется жить/i,
  /нет смысла жить/i,
  /свести сч[её]ты/i,
  /причинить себе/i,
  /порезать себя/i,
  /самоповрежд/i,
  /лучше бы меня не было/i,
  /хочу умереть/i,
  // English
  /kill myself/i,
  /end my life/i,
  /take my (own )?life/i,
  /want to die/i,
  /don'?t want to (live|be alive)/i,
  /better off dead/i,
  /hurt myself/i,
  /self[- ]?harm/i,
  /cut myself/i,
  // Қазақша
  /өзімді[- ]?өзім өлтір/i,
  /өзімді өлтір/i,
  /өмір сүргім келмейді/i,
  /өлгім келеді/i,
  /өзіме қол жұмса/i,
  /өзіме зиян/i,
];

export function looksLikeCrisis(text: string) {
  return RISK_PATTERNS.some((r) => r.test(text));
}
