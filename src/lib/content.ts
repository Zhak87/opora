import type { Locale } from "@/i18n/config";

type ByLocale<T> = Record<Locale, T>;

const DAILY: ByLocale<string[]> = {
  ru: [
    "Что сегодня было для вас хоть немного приятным?",
    "Какое чувство чаще всего было с вами сегодня?",
    "О чём вы сейчас больше всего думаете?",
    "Что вам сейчас нужнее всего: отдых, поддержка или ясность?",
    "За что вы можете сегодня поблагодарить себя?",
    "Какой маленький шаг вы могли бы сделать завтра для себя?",
    "Что вас сегодня удивило?",
    "Когда сегодня вы чувствовали себя спокойнее всего?",
    "Что вы хотели бы отпустить?",
    "Кто или что сегодня поддержало вас?",
    "Чему вас научила эта неделя?",
    "Что важно для вас, даже если никто этого не видит?",
    "Какие слова вам хотелось бы сейчас услышать?",
    "Что помогает вам возвращаться к себе?",
  ],
  kk: [
    "Бүгін сізге аздап болса да не ұнады?",
    "Бүгін сізде қандай сезім жиі болды?",
    "Қазір ең көп не туралы ойлап жүрсіз?",
    "Қазір сізге не көбірек керек: демалыс па, қолдау ма, әлде айқындық па?",
    "Бүгін өзіңізге не үшін алғыс айта аласыз?",
    "Ертең өзіңіз үшін қандай кішкентай қадам жасай аласыз?",
    "Бүгін сізді не таң қалдырды?",
    "Бүгін қай кезде өзіңізді ең тыныш сезіндіңіз?",
    "Неден арылғыңыз келеді?",
    "Бүгін сізге кім немесе не демеу болды?",
    "Бұл апта сізге не үйретті?",
    "Ешкім көрмесе де, сіз үшін не маңызды?",
    "Дәл қазір қандай сөздерді естігіңіз келеді?",
    "Өзіңізге қайта оралуға не көмектеседі?",
  ],
  en: [
    "What felt even a little pleasant today?",
    "Which feeling was with you most today?",
    "What's on your mind the most right now?",
    "What do you need most right now: rest, support or clarity?",
    "What can you thank yourself for today?",
    "What small step could you take for yourself tomorrow?",
    "What surprised you today?",
    "When did you feel calmest today?",
    "What would you like to let go of?",
    "Who or what supported you today?",
    "What has this week taught you?",
    "What matters to you, even if no one sees it?",
    "What words would you like to hear right now?",
    "What helps you come back to yourself?",
  ],
};

type Thought = { text: string; note: string };
const THOUGHTS: ByLocale<Thought[]> = {
  ru: [
    { text: "Даже самая длинная ночь заканчивается рассветом.", note: "Трудное время не длится вечно, даже если сейчас так кажется." },
    { text: "Вам не нужно видеть всю лестницу. Достаточно сделать первый шаг.", note: "Ясность часто приходит в движении, а не до него." },
    { text: "Медленно — это тоже вперёд.", note: "Ваш темп имеет право быть вашим." },
    { text: "Вы уже пережили много дней, которые казались невыносимыми.", note: "Эта сила по-прежнему с вами." },
    { text: "Надежда — это не уверенность, что всё будет хорошо. Это ощущение, что во всём есть смысл.", note: "Можно не знать, чем всё закончится, и всё равно продолжать." },
    { text: "Иногда самое смелое, что можно сделать, — просто отдохнуть.", note: "Забота о себе — не слабость." },
    { text: "Вы больше, чем ваши самые трудные мысли.", note: "Мысли приходят и уходят. Вы остаётесь." },
    { text: "Маленькое доброе дело меняет больше, чем кажется.", note: "В том числе доброе дело по отношению к себе." },
    { text: "То, что вы ищете, тоже ищет вас.", note: "Путь складывается шаг за шагом." },
  ],
  kk: [
    { text: "Ең ұзақ түн де таң атумен аяқталады.", note: "Қиын кезең мәңгі созылмайды, қазір солай көрінсе де." },
    { text: "Бүкіл баспалдақты көрудің қажеті жоқ. Алғашқы қадамды жасау жеткілікті.", note: "Айқындық көбіне қозғалыстан бұрын емес, қозғалыс үстінде келеді." },
    { text: "Баяу жүру де — алға жүру.", note: "Сіздің қарқыныңыз өзіңізге ғана тән болуға құқылы." },
    { text: "Сіз шыдап болмастай көрінген талай күнді бастан өткердіңіз.", note: "Сол күш әлі де сізбен бірге." },
    { text: "Үміт — бәрі жақсы болады деген сенімділік емес. Бұл — бәрінің мәні бар екенін сезіну.", note: "Соңы немен бітерін білмей-ақ, әрі қарай жүре беруге болады." },
    { text: "Кейде ең батыл қадам — жай ғана демалу.", note: "Өзіңізге қамқор болу — әлсіздік емес." },
    { text: "Сіз ең ауыр ойларыңыздан әлдеқайда үлкенсіз.", note: "Ойлар келеді де кетеді. Ал сіз қаласыз." },
    { text: "Кішкентай жақсылық ойлағаннан да көп нәрсені өзгертеді.", note: "Соның ішінде өзіңізге жасаған жақсылық та." },
    { text: "Сіз іздеген нәрсе де сізді іздеп жүр.", note: "Жол қадам-қадаммен қалыптасады." },
  ],
  en: [
    { text: "Even the longest night ends with dawn.", note: "Hard times don't last forever, even if it feels that way right now." },
    { text: "You don't need to see the whole staircase. Just take the first step.", note: "Clarity often comes while you're moving, not before." },
    { text: "Slow is still forward.", note: "Your pace has every right to be your own." },
    { text: "You have already lived through many days that seemed unbearable.", note: "That strength is still with you." },
    { text: "Hope isn't certainty that everything will turn out fine. It's a sense that there is meaning in it all.", note: "You can not know how things will end and still keep going." },
    { text: "Sometimes the bravest thing you can do is simply rest.", note: "Taking care of yourself is not weakness." },
    { text: "You are more than your hardest thoughts.", note: "Thoughts come and go. You remain." },
    { text: "A small kindness changes more than it seems.", note: "That includes a kindness toward yourself." },
    { text: "What you are looking for is looking for you, too.", note: "The path takes shape one step at a time." },
  ],
};

type Reflection = { title: string; body: string };
const REFL: ByLocale<Reflection[]> = {
  ru: [
    {
      title: "О тихих днях",
      body: "Не каждый день должен быть продуктивным или особенным. Бывают дни, когда достаточно просто прожить их бережно: выпить тёплый чай, выйти на воздух, лечь спать пораньше. Такие дни тоже часть пути. Они дают силы на то, что будет потом.",
    },
    {
      title: "О том, что уже есть",
      body: "Когда трудно, взгляд сам цепляется за то, чего не хватает. Попробуйте на минуту заметить то, что уже есть: человек, который однажды вас поддержал; умение, которое вы освоили; утро, которое всё-таки наступило. Это не отменяет трудностей, но напоминает, что опора существует.",
    },
    {
      title: "О смысле",
      body: "Смысл не всегда находится раз и навсегда. Чаще он складывается из маленьких вещей: из того, кого мы любим, что создаём, чему учимся, как относимся к другим. Иногда смысл в том, чтобы просто продолжать, пока не станет яснее.",
    },
  ],
  kk: [
    {
      title: "Тыныш күндер туралы",
      body: "Әр күн өнімді немесе ерекше болуға міндетті емес. Кейде күнді жай ғана аялап өткізу жеткілікті: жылы шай ішу, таза ауаға шығу, ертерек ұйықтау. Мұндай күндер де — жолдың бір бөлігі. Олар алдағы істерге күш береді.",
    },
    {
      title: "Бар нәрсе туралы",
      body: "Қиын кезде көз өзінен-өзі жетіспейтін нәрсеге ауады. Бір минутқа бар нәрсені байқап көріңіз: бір кездері сізге демеу болған адамды; меңгерген дағдыңызды; бәрібір атқан таңды. Бұл қиындықтарды жоймайды, бірақ сүйенер тірек бар екенін еске салады.",
    },
    {
      title: "Мән туралы",
      body: "Мән әрдайым бір рет және мәңгілікке табыла бермейді. Көбіне ол ұсақ нәрселерден құралады: кімді жақсы көретінімізден, не жасайтынымыздан, неге үйренетінімізден, өзгелерге қалай қарайтынымыздан. Кейде мән — бәрі айқындала түскенше жай ғана әрі қарай жүре беруде.",
    },
  ],
  en: [
    {
      title: "On quiet days",
      body: "Not every day has to be productive or special. Some days it's enough to simply get through them gently: have a warm cup of tea, step outside, go to bed a little earlier. Days like these are part of the path too. They give you strength for what comes next.",
    },
    {
      title: "On what is already here",
      body: "When things are hard, our eyes go straight to what's missing. Try, for a minute, to notice what is already here: someone who once supported you; a skill you've learned; a morning that came after all. It doesn't erase the hard parts, but it reminds you that support exists.",
    },
    {
      title: "On meaning",
      body: "Meaning isn't always found once and for all. More often it's made of small things: who we love, what we create, what we learn, how we treat others. Sometimes the meaning is simply to keep going until things become clearer.",
    },
  ],
};

const QUESTIONS: ByLocale<string[]> = {
  ru: [
    "Что помогло вам пережить самый трудный период в жизни?",
    "Какой вы хотели бы видеть свою жизнь через год, если думать мягко?",
    "Что даёт вам ощущение смысла, даже совсем небольшое?",
    "Кто для вас пример стойкости и надежды?",
    "Что вы сказали бы себе в прошлом, зная то, что знаете сейчас?",
  ],
  kk: [
    "Өміріңіздегі ең қиын кезеңнен өтуге сізге не көмектесті?",
    "Асықпай, жұмсақ ойлансаңыз, бір жылдан кейін өміріңізді қандай күйде көргіңіз келеді?",
    "Тіпті кішкентай болса да, сізге мән сезімін не береді?",
    "Сіз үшін төзімділік пен үміттің үлгісі кім?",
    "Қазір білетініңізді біле тұра, бұрынғы өзіңізге не айтар едіңіз?",
  ],
  en: [
    "What helped you get through the hardest time in your life?",
    "Thinking gently, how would you like your life to look a year from now?",
    "What gives you a sense of meaning, even a small one?",
    "Who is an example of resilience and hope for you?",
    "Knowing what you know now, what would you tell your past self?",
  ],
};

type Prompt = { title: string; text: string };
const PROMPTS: ByLocale<Prompt[]> = {
  ru: [
    { title: "О будущем", text: "Хочу поговорить о будущем и о том, чего я жду." },
    { title: "О смысле", text: "Хочу поразмышлять о смысле: зачем всё это и что для меня важно." },
    { title: "О надежде", text: "Мне сейчас трудно чувствовать надежду. Хочу об этом поговорить." },
    { title: "О своём пути", text: "Хочу разобраться, какой путь мой." },
  ],
  kk: [
    { title: "Болашақ туралы", text: "Болашақ туралы және неден үміттенетінім туралы сөйлескім келеді." },
    { title: "Мән туралы", text: "Мән туралы ойланғым келеді: мұның бәрі не үшін және мен үшін не маңызды." },
    { title: "Үміт туралы", text: "Қазір үміт сезіну маған қиын. Осы туралы сөйлескім келеді." },
    { title: "Өз жолым туралы", text: "Қай жол менікі екенін түсінгім келеді." },
  ],
  en: [
    { title: "About the future", text: "I'd like to talk about the future and what I'm hoping for." },
    { title: "About meaning", text: "I'd like to reflect on meaning: what it's all for and what matters to me." },
    { title: "About hope", text: "It's hard for me to feel hope right now. I'd like to talk about it." },
    { title: "About my path", text: "I want to figure out which path is mine." },
  ],
};

// Русские наборы (как раньше).
export const DAILY_QUESTIONS = DAILY.ru;
export const HOPE_THOUGHTS = THOUGHTS.ru;
export const REFLECTIONS = REFL.ru;
export const HOPE_QUESTIONS = QUESTIONS.ru;
export const HOPE_PROMPTS = PROMPTS.ru;

// Наборы на нужном языке. Длина и порядок одинаковы во всех языках, поэтому pickForDay выбирает один и тот же пункт.
export const dailyQuestions = (locale: Locale) => DAILY[locale];
export const hopeThoughts = (locale: Locale) => THOUGHTS[locale];
export const reflections = (locale: Locale) => REFL[locale];
export const hopeQuestions = (locale: Locale) => QUESTIONS[locale];
export const hopePrompts = (locale: Locale) => PROMPTS[locale];

export function pickForDay<T>(items: T[], offset = 0): T {
  const day = Math.floor(Date.now() / 86_400_000);
  return items[(day + offset) % items.length];
}

export const JOURNAL_KINDS = {
  thought: { label: "Мысль", tone: "blue" },
  event: { label: "Событие", tone: "beige" },
  gratitude: { label: "Благодарность", tone: "green" },
  goal: { label: "Цель", tone: "lavender" },
  feeling: { label: "Переживание", tone: "lavender" },
} as const;

export type JournalKind = keyof typeof JOURNAL_KINDS;
export type JournalKinds = { [K in JournalKind]: { label: string; tone: (typeof JOURNAL_KINDS)[K]["tone"] } };

const KIND_LABELS: Record<Exclude<Locale, "ru">, Record<JournalKind, string>> = {
  kk: { thought: "Ой", event: "Оқиға", gratitude: "Алғыс", goal: "Мақсат", feeling: "Сезім" },
  en: { thought: "Thought", event: "Event", gratitude: "Gratitude", goal: "Goal", feeling: "Feeling" },
};

// Виды записей дневника с подписями на нужном языке (та же форма, что у JOURNAL_KINDS).
export function journalKinds(locale: Locale): JournalKinds {
  if (locale === "ru") return JOURNAL_KINDS;
  const labels = KIND_LABELS[locale];
  return Object.fromEntries(
    (Object.keys(JOURNAL_KINDS) as JournalKind[]).map((k) => [k, { ...JOURNAL_KINDS[k], label: labels[k] }]),
  ) as JournalKinds;
}
