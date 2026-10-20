import { defineMessages, plural } from "./config";

// ИИ-аналитика и рабочие заметки психолога.
export const REPORT_PERIODS = [30, 90, 180] as const;
export const NOTE_KINDS = ["note", "hypothesis", "session", "plan"] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];
type Kind = NoteKind;

export const analyticsMessages = defineMessages<{
  title: string;
  open: string;
  lead: string;
  disclaimer: string;
  off: string;
  noConsent: string;
  generate: { title: string; period: string; periods: Record<number, string>; submit: string; pending: string; hint: string };
  report: {
    period: (from: string, to: string) => string;
    sources: string;
    scopes: Record<string, string>;
    summary: string;
    wellbeing: string;
    trend: Record<"better" | "worse" | "stable" | "unclear", string>;
    themes: string;
    concerns: string;
    needs: string;
    dynamics: string;
    questions: string;
    recommendations: string;
    limitations: string;
    basis: Record<"fact" | "assumption", string>;
    confidence: Record<"low" | "medium" | "high", string>;
    confidenceLabel: string;
    evidence: string;
    empty: string;
    createdAt: (date: string) => string;
  };
  compare: { title: string; before: string; now: string; newThemes: string; goneThemes: string; same: string; none: string };
  history: { title: string; current: string; empty: string; count: (n: number) => string };
  timeline: { title: string; empty: string; session: string; report: string; goal: string; balance: string; checkin: string };
  notes: {
    title: string;
    lead: string;
    kinds: Record<Kind, string>;
    kind: string;
    placeholder: string;
    add: string;
    edit: string;
    cancel: string;
    save: string;
    remove: string;
    removeConfirm: string;
    empty: string;
    forSession: string;
    edited: string;
  };
  sessionPrep: { title: string; from: (date: string) => string };
  errors: { generic: string; tooMuch: string; empty: string; tooLittle: string; busy: string; forbidden: string; off: string };
}>({
  ru: {
    title: "ИИ-аналитика",
    open: "ИИ-аналитика",
    lead: "Сводка по материалам, которыми клиент разрешил делиться: темы, переживания, потребности, динамика и вопросы к встрече.",
    disclaimer:
      "Это вспомогательная сводка, а не заключение. ИИ не ставит диагнозов, может ошибаться и не видит человека целиком. Пункты «факт» опираются на данные клиента, «предположение» — гипотеза ИИ для проверки. Решения принимаете вы.",
    off: "ИИ-аналитика не подключена. Её включают, когда данные клиентов уходят только к ИИ-провайдеру, который не обучается на них.",
    noConsent: "Клиент не разрешил ИИ-аналитику. Если это изменится, здесь можно будет подготовить сводку.",
    generate: {
      title: "Новая сводка",
      period: "Период",
      periods: { 30: "30 дней", 90: "3 месяца", 180: "6 месяцев" },
      submit: "Подготовить сводку",
      pending: "ИИ читает материалы…",
      hint: "Клиент увидит в журнале, что вы подготовили сводку. Имя клиента ИИ не передаётся.",
    },
    report: {
      period: (from, to) => `${from} — ${to}`,
      sources: "Источники",
      scopes: { wellbeing: "самочувствие", goals: "цели", journal: "дневник", ai_chats: "разговоры с ИИ" },
      summary: "Главное",
      wellbeing: "Самочувствие",
      trend: { better: "лучше", worse: "хуже", stable: "без изменений", unclear: "неясно" },
      themes: "Основные темы",
      concerns: "Повторяющиеся переживания",
      needs: "Потребности и цели",
      dynamics: "Динамика",
      questions: "Вопросы к встрече",
      recommendations: "Идеи для работы",
      limitations: "Ограничения сводки",
      basis: { fact: "факт", assumption: "предположение" },
      confidence: { low: "низкая", medium: "средняя", high: "высокая" },
      confidenceLabel: "уверенность",
      evidence: "Из материалов",
      empty: "Ничего не найдено.",
      createdAt: (date) => `Подготовлена ${date}`,
    },
    compare: {
      title: "По сравнению с прошлой сводкой",
      before: "Было",
      now: "Сейчас",
      newThemes: "Новые темы",
      goneThemes: "Ушли из фокуса",
      same: "Темы те же",
      none: "Это первая сводка — сравнивать пока не с чем.",
    },
    history: {
      title: "Прошлые сводки",
      current: "открыта",
      empty: "Сводок пока нет.",
      count: (n) => `${n} ${plural("ru", n, { one: "сводка", few: "сводки", many: "сводок" })}`,
    },
    timeline: {
      title: "Хронология",
      empty: "Событий за период нет.",
      session: "Встреча",
      report: "ИИ-сводка",
      goal: "Шаг по цели",
      balance: "Колесо баланса",
      checkin: "Трудный день",
    },
    notes: {
      title: "Мои заметки",
      lead: "Видите только вы. Клиенту они не показываются и в ИИ-аналитику не попадают.",
      kinds: { note: "Заметка", hypothesis: "Гипотеза", session: "Итоги встречи", plan: "План" },
      kind: "Тип",
      placeholder: "Наблюдение, гипотеза, что важно не забыть…",
      add: "Добавить",
      edit: "Изменить",
      cancel: "Отмена",
      save: "Сохранить",
      remove: "Удалить",
      removeConfirm: "Удалить заметку?",
      empty: "Заметок пока нет.",
      forSession: "к встрече",
      edited: "изменена",
    },
    sessionPrep: { title: "Вопросы из ИИ-сводки", from: (date) => `из сводки от ${date}` },
    errors: {
      generic: "Не получилось. Попробуйте ещё раз.",
      tooMuch: "Слишком много сводок подряд. Попробуйте через час.",
      empty: "Напишите текст заметки.",
      tooLittle: "За этот период слишком мало данных для сводки. Выберите период длиннее или подождите новых отметок.",
      busy: "ИИ сейчас не ответил. Попробуйте через минуту.",
      forbidden: "Нет доступа: клиент закрыл доступ или работа завершена.",
      off: "ИИ-аналитика не подключена.",
    },
  },
  kk: {
    title: "ЖИ-аналитика",
    open: "ЖИ-аналитика",
    lead: "Клиент бөлісуге рұқсат берген материалдар бойынша шолу: тақырыптар, уайымдар, қажеттіліктер, динамика және кездесуге сұрақтар.",
    disclaimer:
      "Бұл қорытынды емес, көмекші шолу. ЖИ диагноз қоймайды, қателесуі мүмкін және адамды толық көрмейді. «Дерек» белгісі клиент деректеріне сүйенеді, «болжам» — тексеруге арналған ЖИ гипотезасы. Шешімді сіз қабылдайсыз.",
    off: "ЖИ-аналитика қосылмаған. Ол клиент деректері тек солармен оқытылмайтын ЖИ-провайдерге жіберілгенде қосылады.",
    noConsent: "Клиент ЖИ-аналитикаға рұқсат бермеген. Бұл өзгерсе, осында шолу дайындауға болады.",
    generate: {
      title: "Жаңа шолу",
      period: "Кезең",
      periods: { 30: "30 күн", 90: "3 ай", 180: "6 ай" },
      submit: "Шолу дайындау",
      pending: "ЖИ материалдарды оқып жатыр…",
      hint: "Клиент журналдан сіздің шолу дайындағаныңызды көреді. Клиенттің аты ЖИ-ге берілмейді.",
    },
    report: {
      period: (from, to) => `${from} — ${to}`,
      sources: "Дереккөздер",
      scopes: { wellbeing: "көңіл күй", goals: "мақсаттар", journal: "күнделік", ai_chats: "ЖИ-мен әңгімелер" },
      summary: "Ең бастысы",
      wellbeing: "Көңіл күй",
      trend: { better: "жақсырақ", worse: "нашарлау", stable: "өзгеріссіз", unclear: "белгісіз" },
      themes: "Негізгі тақырыптар",
      concerns: "Қайталанатын уайымдар",
      needs: "Қажеттіліктер мен мақсаттар",
      dynamics: "Динамика",
      questions: "Кездесуге сұрақтар",
      recommendations: "Жұмысқа идеялар",
      limitations: "Шолудың шектеулері",
      basis: { fact: "дерек", assumption: "болжам" },
      confidence: { low: "төмен", medium: "орташа", high: "жоғары" },
      confidenceLabel: "сенімділік",
      evidence: "Материалдардан",
      empty: "Ештеңе табылмады.",
      createdAt: (date) => `Дайындалған күні: ${date}`,
    },
    compare: {
      title: "Алдыңғы шолумен салыстырғанда",
      before: "Бұрын",
      now: "Қазір",
      newThemes: "Жаңа тақырыптар",
      goneThemes: "Назардан шыққандар",
      same: "Тақырыптар сол күйі",
      none: "Бұл алғашқы шолу, әзірге салыстыратын ештеңе жоқ.",
    },
    history: { title: "Бұрынғы шолулар", current: "ашық", empty: "Әзірге шолу жоқ.", count: (n) => `${n} шолу` },
    timeline: {
      title: "Хронология",
      empty: "Бұл кезеңде оқиға жоқ.",
      session: "Кездесу",
      report: "ЖИ-шолу",
      goal: "Мақсатқа қадам",
      balance: "Теңгерім дөңгелегі",
      checkin: "Ауыр күн",
    },
    notes: {
      title: "Менің жазбаларым",
      lead: "Тек сіз көресіз. Клиентке көрсетілмейді және ЖИ-аналитикаға кірмейді.",
      kinds: { note: "Жазба", hypothesis: "Гипотеза", session: "Кездесу қорытындысы", plan: "Жоспар" },
      kind: "Түрі",
      placeholder: "Байқау, гипотеза, ұмытпау керек нәрсе…",
      add: "Қосу",
      edit: "Өзгерту",
      cancel: "Болдырмау",
      save: "Сақтау",
      remove: "Жою",
      removeConfirm: "Жазбаны жою керек пе?",
      empty: "Әзірге жазба жоқ.",
      forSession: "кездесуге",
      edited: "өзгертілген",
    },
    sessionPrep: { title: "ЖИ-шолудан сұрақтар", from: (date) => `${date} шолуынан` },
    errors: {
      generic: "Болмады. Қайта көріңіз.",
      tooMuch: "Шолу тым көп. Бір сағаттан кейін көріңіз.",
      empty: "Жазба мәтінін жазыңыз.",
      tooLittle: "Бұл кезеңде шолуға дерек тым аз. Ұзағырақ кезеңді таңдаңыз немесе жаңа белгілерді күтіңіз.",
      busy: "ЖИ қазір жауап бермеді. Бір минуттан кейін көріңіз.",
      forbidden: "Қолжетім жоқ: клиент рұқсатты жапты немесе жұмыс аяқталды.",
      off: "ЖИ-аналитика қосылмаған.",
    },
  },
  en: {
    title: "AI insights",
    open: "AI insights",
    lead: "A summary of what the client agreed to share: themes, recurring worries, needs, trends and questions for the session.",
    disclaimer:
      "This is a supporting summary, not an assessment. The AI does not diagnose, can be wrong and does not see the whole person. “Fact” items rest on the client's data; “assumption” is an AI hypothesis to check. You make the decisions.",
    off: "AI insights are not connected. They are turned on once client data goes only to an AI provider that does not train on it.",
    noConsent: "The client hasn't allowed AI insights. If that changes, you can prepare a summary here.",
    generate: {
      title: "New summary",
      period: "Period",
      periods: { 30: "30 days", 90: "3 months", 180: "6 months" },
      submit: "Prepare summary",
      pending: "The AI is reading…",
      hint: "The client will see in their log that you prepared a summary. The client's name is not sent to the AI.",
    },
    report: {
      period: (from, to) => `${from} – ${to}`,
      sources: "Sources",
      scopes: { wellbeing: "wellbeing", goals: "goals", journal: "journal", ai_chats: "AI conversations" },
      summary: "Key points",
      wellbeing: "Wellbeing",
      trend: { better: "better", worse: "worse", stable: "stable", unclear: "unclear" },
      themes: "Main themes",
      concerns: "Recurring worries",
      needs: "Needs and goals",
      dynamics: "How things changed",
      questions: "Questions for the session",
      recommendations: "Ideas for your work",
      limitations: "Limits of this summary",
      basis: { fact: "fact", assumption: "assumption" },
      confidence: { low: "low", medium: "medium", high: "high" },
      confidenceLabel: "confidence",
      evidence: "From the material",
      empty: "Nothing found.",
      createdAt: (date) => `Prepared ${date}`,
    },
    compare: {
      title: "Compared with the previous summary",
      before: "Before",
      now: "Now",
      newThemes: "New themes",
      goneThemes: "Out of focus",
      same: "Same themes",
      none: "This is the first summary, so there's nothing to compare yet.",
    },
    history: {
      title: "Earlier summaries",
      current: "open",
      empty: "No summaries yet.",
      count: (n) => `${n} ${plural("en", n, { one: "summary", other: "summaries" })}`,
    },
    timeline: {
      title: "Timeline",
      empty: "Nothing happened in this period.",
      session: "Session",
      report: "AI summary",
      goal: "Goal step",
      balance: "Balance wheel",
      checkin: "Hard day",
    },
    notes: {
      title: "My notes",
      lead: "Only you see them. They are never shown to the client and never go into AI insights.",
      kinds: { note: "Note", hypothesis: "Hypothesis", session: "Session outcome", plan: "Plan" },
      kind: "Type",
      placeholder: "An observation, a hypothesis, something to remember…",
      add: "Add",
      edit: "Edit",
      cancel: "Cancel",
      save: "Save",
      remove: "Delete",
      removeConfirm: "Delete this note?",
      empty: "No notes yet.",
      forSession: "for session",
      edited: "edited",
    },
    sessionPrep: { title: "Questions from the AI summary", from: (date) => `from the ${date} summary` },
    errors: {
      generic: "That didn't work. Please try again.",
      tooMuch: "Too many summaries in a row. Try again in an hour.",
      empty: "Write the note text.",
      tooLittle: "There's too little data in this period for a summary. Pick a longer period or wait for new check-ins.",
      busy: "The AI didn't respond. Try again in a minute.",
      forbidden: "No access: the client closed access or the work has ended.",
      off: "AI insights are not connected.",
    },
  },
});
