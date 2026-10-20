import { defineMessages, plural } from "./config";

// Моё состояние: отметки самочувствия, колесо баланса и цели.
export const METRICS = ["mood", "energy", "calm", "sleep"] as const;
export type Metric = (typeof METRICS)[number];
export const FEELINGS = ["joy", "calm", "gratitude", "interest", "hope", "tired", "anxious", "sad", "irritated", "lonely", "overwhelmed", "confused"] as const;
export const AREAS = ["body", "rest", "work", "money", "relations", "family", "growth", "joy"] as const;
export type Area = (typeof AREAS)[number];

type Scale = { label: string; low: string; high: string };

export const wellbeingMessages = defineMessages<{
  title: string;
  lead: string;
  tabs: { checkin: string; balance: string; goals: string };
  notClinical: string;
  checkin: {
    today: string;
    edit: string;
    scales: Record<Metric, Scale>;
    feelings: string;
    feelingNames: Record<(typeof FEELINGS)[number], string>;
    note: string;
    notePlaceholder: string;
    save: string;
    saved: string;
    homeTitle: string;
    homeDone: string;
    homeText: string;
  };
  chart: {
    title: string;
    periods: { 7: string; 30: string; 90: string };
    average: string;
    vsPrev: (delta: string) => string;
    noPrev: string;
    noData: string;
    table: string;
    date: string;
    count: (n: number) => string;
    feelingsTop: string;
    notes: string;
  };
  balance: {
    title: string;
    intro: string;
    areas: Record<Area, string>;
    save: string;
    saved: string;
    current: string;
    previous: string;
    history: string;
    none: string;
    change: string;
    note: string;
  };
  goals: {
    title: string;
    intro: string;
    add: string;
    name: string;
    namePlaceholder: string;
    why: string;
    whyPlaceholder: string;
    target: string;
    create: string;
    empty: string;
    progress: string;
    step: string;
    stepPlaceholder: string;
    saveStep: string;
    status: { active: string; done: string; paused: string; dropped: string };
    markDone: string;
    pause: string;
    resume: string;
    drop: string;
    remove: string;
    removeConfirm: string;
    until: (date: string) => string;
    updates: string;
    archived: string;
  };
  pro: {
    wellbeing: string;
    goals: string;
    notShared: string;
    lastCheckin: string;
    balance: string;
    noGoals: string;
  };
  errors: { generic: string; mood: string; title: string };
}>({
  ru: {
    title: "Моё состояние",
    lead: "Короткие отметки о том, как вы, и ваши цели. Видите их вы, а психолог — только если вы разрешили.",
    tabs: { checkin: "Самочувствие", balance: "Колесо баланса", goals: "Цели" },
    notClinical: "Это не тест и не диагностика, а ваш личный дневник состояния: он помогает замечать перемены.",
    checkin: {
      today: "Как вы сегодня?",
      edit: "Сегодняшняя отметка сохранена, её можно поправить.",
      scales: {
        mood: { label: "Настроение", low: "тяжело", high: "хорошо" },
        energy: { label: "Энергия", low: "нет сил", high: "много сил" },
        calm: { label: "Спокойствие", low: "тревожно", high: "спокойно" },
        sleep: { label: "Сон", low: "плохой", high: "крепкий" },
      },
      feelings: "Что чувствуете",
      feelingNames: {
        joy: "радость",
        calm: "покой",
        gratitude: "благодарность",
        interest: "интерес",
        hope: "надежда",
        tired: "усталость",
        anxious: "тревога",
        sad: "грусть",
        irritated: "раздражение",
        lonely: "одиночество",
        overwhelmed: "перегруз",
        confused: "растерянность",
      },
      note: "Пара слов о дне (по желанию)",
      notePlaceholder: "Что повлияло на состояние?",
      save: "Сохранить отметку",
      saved: "Отметка сохранена",
      homeTitle: "Отметить самочувствие",
      homeDone: "Сегодня вы уже отметились",
      homeText: "Полминуты: настроение, энергия, сон. Так видна динамика.",
    },
    chart: {
      title: "Динамика",
      periods: { 7: "7 дней", 30: "30 дней", 90: "3 месяца" },
      average: "В среднем за период",
      vsPrev: (d) => `${d} к прошлому периоду`,
      noPrev: "прошлый период без отметок",
      noData: "За этот период отметок нет.",
      table: "Таблица",
      date: "Дата",
      count: (n) => `${n} ${plural("ru", n, { one: "отметка", few: "отметки", many: "отметок" })}`,
      feelingsTop: "Чаще всего",
      notes: "Заметки",
    },
    balance: {
      title: "Колесо баланса",
      intro: "Оцените каждую сферу от 0 до 10: насколько вы ею сейчас довольны. Повторяйте раз в несколько недель и сравнивайте.",
      areas: {
        body: "Здоровье и тело",
        rest: "Отдых",
        work: "Работа и учёба",
        money: "Деньги",
        relations: "Близкие отношения",
        family: "Семья и друзья",
        growth: "Развитие",
        joy: "Радость и увлечения",
      },
      save: "Сохранить оценку",
      saved: "Оценка сохранена",
      current: "Сейчас",
      previous: "Прошлый раз",
      history: "Прошлые оценки",
      none: "Вы ещё не заполняли колесо баланса.",
      change: "Изменение",
      note: "Комментарий (по желанию)",
    },
    goals: {
      title: "Цели",
      intro: "Небольшие, понятные шаги к тому, что для вас важно.",
      add: "Новая цель",
      name: "Цель",
      namePlaceholder: "Например: ложиться спать до 23:00",
      why: "Зачем это мне",
      whyPlaceholder: "Что изменится, когда получится",
      target: "Срок (по желанию)",
      create: "Добавить цель",
      empty: "Целей пока нет. Начните с одной небольшой.",
      progress: "Прогресс",
      step: "Отметить шаг",
      stepPlaceholder: "Что получилось?",
      saveStep: "Сохранить",
      status: { active: "в работе", done: "достигнута", paused: "на паузе", dropped: "отложена" },
      markDone: "Цель достигнута",
      pause: "Пауза",
      resume: "Вернуть в работу",
      drop: "Отложить",
      remove: "Удалить",
      removeConfirm: "Удалить цель и её отметки?",
      until: (d) => `до ${d}`,
      updates: "Отметки",
      archived: "Завершённые и отложенные",
    },
    pro: {
      wellbeing: "Самочувствие",
      goals: "Цели клиента",
      notShared: "Клиент пока не разрешил это видеть.",
      lastCheckin: "Последняя отметка",
      balance: "Колесо баланса",
      noGoals: "Клиент пока не ставил целей.",
    },
    errors: { generic: "Не получилось сохранить. Попробуйте ещё раз.", mood: "Отметьте хотя бы настроение.", title: "Напишите, какая цель." },
  },
  kk: {
    title: "Менің күйім",
    lead: "Көңіл күйіңіз туралы қысқа белгілер және мақсаттарыңыз. Оларды сіз көресіз, ал психолог тек рұқсат берсеңіз ғана.",
    tabs: { checkin: "Көңіл күй", balance: "Теңгерім дөңгелегі", goals: "Мақсаттар" },
    notClinical: "Бұл тест те, диагностика да емес, күйіңіздің жеке күнделігі: ол өзгерістерді байқауға көмектеседі.",
    checkin: {
      today: "Бүгін қалайсыз?",
      edit: "Бүгінгі белгі сақталды, оны түзетуге болады.",
      scales: {
        mood: { label: "Көңіл күй", low: "ауыр", high: "жақсы" },
        energy: { label: "Қуат", low: "күш жоқ", high: "күш көп" },
        calm: { label: "Тыныштық", low: "алаңдаулы", high: "тыныш" },
        sleep: { label: "Ұйқы", low: "нашар", high: "жақсы ұйықтадым" },
      },
      feelings: "Не сезінесіз",
      feelingNames: {
        joy: "қуаныш",
        calm: "тыныштық",
        gratitude: "алғыс",
        interest: "қызығушылық",
        hope: "үміт",
        tired: "шаршау",
        anxious: "алаң",
        sad: "мұң",
        irritated: "ашу",
        lonely: "жалғыздық",
        overwhelmed: "шамадан тыс жүктеме",
        confused: "абыржу",
      },
      note: "Күн туралы бірер сөз (қаласаңыз)",
      notePlaceholder: "Күйіңізге не әсер етті?",
      save: "Белгіні сақтау",
      saved: "Белгі сақталды",
      homeTitle: "Көңіл күйді белгілеу",
      homeDone: "Бүгін белгі қойдыңыз",
      homeText: "Жарты минут: көңіл күй, қуат, ұйқы. Осылай өзгеріс көрінеді.",
    },
    chart: {
      title: "Өзгеріс",
      periods: { 7: "7 күн", 30: "30 күн", 90: "3 ай" },
      average: "Кезең бойынша орташа",
      vsPrev: (d) => `өткен кезеңмен салыстырғанда ${d}`,
      noPrev: "өткен кезеңде белгі жоқ",
      noData: "Бұл кезеңде белгі жоқ.",
      table: "Кесте",
      date: "Күні",
      count: (n) => `${n} белгі`,
      feelingsTop: "Жиі кездесетіні",
      notes: "Жазбалар",
    },
    balance: {
      title: "Теңгерім дөңгелегі",
      intro: "Әр саланы 0-ден 10-ға дейін бағалаңыз: қазір қаншалықты қанағаттанасыз. Бірнеше апта сайын қайталап, салыстырыңыз.",
      areas: {
        body: "Денсаулық пен дене",
        rest: "Демалыс",
        work: "Жұмыс пен оқу",
        money: "Ақша",
        relations: "Жақын қарым-қатынас",
        family: "Отбасы мен достар",
        growth: "Даму",
        joy: "Қуаныш пен әуестік",
      },
      save: "Бағаны сақтау",
      saved: "Баға сақталды",
      current: "Қазір",
      previous: "Өткен жолы",
      history: "Бұрынғы бағалар",
      none: "Сіз теңгерім дөңгелегін әлі толтырмадыңыз.",
      change: "Өзгеріс",
      note: "Түсініктеме (қаласаңыз)",
    },
    goals: {
      title: "Мақсаттар",
      intro: "Сіз үшін маңызды нәрсеге шағын, түсінікті қадамдар.",
      add: "Жаңа мақсат",
      name: "Мақсат",
      namePlaceholder: "Мысалы: 23:00-ге дейін ұйықтау",
      why: "Маған не үшін керек",
      whyPlaceholder: "Орындалса не өзгереді",
      target: "Мерзімі (қаласаңыз)",
      create: "Мақсат қосу",
      empty: "Әзірге мақсат жоқ. Бір шағын мақсаттан бастаңыз.",
      progress: "Ілгерілеу",
      step: "Қадамды белгілеу",
      stepPlaceholder: "Не шықты?",
      saveStep: "Сақтау",
      status: { active: "жұмыста", done: "орындалды", paused: "үзілісте", dropped: "кейінге қалдырылды" },
      markDone: "Мақсат орындалды",
      pause: "Үзіліс",
      resume: "Жұмысқа қайтару",
      drop: "Кейінге қалдыру",
      remove: "Жою",
      removeConfirm: "Мақсатты және оның белгілерін жою керек пе?",
      until: (d) => `${d} дейін`,
      updates: "Белгілер",
      archived: "Аяқталған және кейінге қалдырылған",
    },
    pro: {
      wellbeing: "Көңіл күй",
      goals: "Клиенттің мақсаттары",
      notShared: "Клиент мұны көруге әлі рұқсат бермеді.",
      lastCheckin: "Соңғы белгі",
      balance: "Теңгерім дөңгелегі",
      noGoals: "Клиент әлі мақсат қоймады.",
    },
    errors: { generic: "Сақталмады. Қайта көріңіз.", mood: "Кем дегенде көңіл күйді белгілеңіз.", title: "Мақсатты жазыңыз." },
  },
  en: {
    title: "How I'm doing",
    lead: "Short check-ins on how you feel, and your goals. You see them; your psychologist only if you allow it.",
    tabs: { checkin: "Wellbeing", balance: "Balance wheel", goals: "Goals" },
    notClinical: "This is not a test or a diagnosis, just your personal mood log: it helps you notice changes.",
    checkin: {
      today: "How are you today?",
      edit: "Today's check-in is saved; you can still adjust it.",
      scales: {
        mood: { label: "Mood", low: "hard", high: "good" },
        energy: { label: "Energy", low: "drained", high: "full of energy" },
        calm: { label: "Calm", low: "anxious", high: "calm" },
        sleep: { label: "Sleep", low: "poor", high: "well rested" },
      },
      feelings: "What do you feel",
      feelingNames: {
        joy: "joy",
        calm: "peace",
        gratitude: "gratitude",
        interest: "interest",
        hope: "hope",
        tired: "tiredness",
        anxious: "anxiety",
        sad: "sadness",
        irritated: "irritation",
        lonely: "loneliness",
        overwhelmed: "overwhelm",
        confused: "confusion",
      },
      note: "A few words about the day (optional)",
      notePlaceholder: "What affected how you feel?",
      save: "Save check-in",
      saved: "Check-in saved",
      homeTitle: "Check in",
      homeDone: "You've checked in today",
      homeText: "Half a minute: mood, energy, sleep. That's how trends show.",
    },
    chart: {
      title: "Trends",
      periods: { 7: "7 days", 30: "30 days", 90: "3 months" },
      average: "Average for the period",
      vsPrev: (d) => `${d} vs previous period`,
      noPrev: "no check-ins in the previous period",
      noData: "No check-ins in this period.",
      table: "Table",
      date: "Date",
      count: (n) => `${n} ${n === 1 ? "check-in" : "check-ins"}`,
      feelingsTop: "Most often",
      notes: "Notes",
    },
    balance: {
      title: "Balance wheel",
      intro: "Rate each area from 0 to 10: how satisfied are you with it right now. Repeat every few weeks and compare.",
      areas: {
        body: "Health and body",
        rest: "Rest",
        work: "Work and study",
        money: "Money",
        relations: "Close relationships",
        family: "Family and friends",
        growth: "Growth",
        joy: "Joy and hobbies",
      },
      save: "Save",
      saved: "Saved",
      current: "Now",
      previous: "Last time",
      history: "Earlier ratings",
      none: "You haven't filled in the balance wheel yet.",
      change: "Change",
      note: "Comment (optional)",
    },
    goals: {
      title: "Goals",
      intro: "Small, clear steps toward what matters to you.",
      add: "New goal",
      name: "Goal",
      namePlaceholder: "For example: go to bed before 11 pm",
      why: "Why it matters to me",
      whyPlaceholder: "What changes when it works",
      target: "Target date (optional)",
      create: "Add goal",
      empty: "No goals yet. Start with one small one.",
      progress: "Progress",
      step: "Log a step",
      stepPlaceholder: "What worked?",
      saveStep: "Save",
      status: { active: "in progress", done: "achieved", paused: "paused", dropped: "set aside" },
      markDone: "Goal achieved",
      pause: "Pause",
      resume: "Resume",
      drop: "Set aside",
      remove: "Delete",
      removeConfirm: "Delete the goal and its steps?",
      until: (d) => `by ${d}`,
      updates: "Steps",
      archived: "Finished and set aside",
    },
    pro: {
      wellbeing: "Wellbeing",
      goals: "Client goals",
      notShared: "The client hasn't allowed you to see this yet.",
      lastCheckin: "Latest check-in",
      balance: "Balance wheel",
      noGoals: "The client hasn't set goals yet.",
    },
    errors: { generic: "Couldn't save. Please try again.", mood: "Please rate at least your mood.", title: "Please name the goal." },
  },
});
