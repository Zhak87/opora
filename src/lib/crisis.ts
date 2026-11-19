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

// Признаки тревоги: тогда под чатом предлагаем сначала успокаивающее упражнение, а потом разговор.
const ANXIETY_PATTERNS = [
  /тревож|тревог|паник|беспоко|волну[юе]|нервнича|не могу успокоиться|страшно|боюсь|накрыло|задыха|сердце (колотится|бь[её]тся|стучит)|трясёт|трясет|не нахожу себе места/i,
  /anxi|panic|worr(y|ied)|nervous|scared|freaking out|can'?t calm|heart (is )?(racing|pounding)|can'?t breathe/i,
  /алаңда|мазасыз|үрей|қорқ|уайымда|дүрбелең|жүрегім соғ|тыныштал/i,
];

export function looksAnxious(text: string) {
  return ANXIETY_PATTERNS.some((r) => r.test(text));
}
