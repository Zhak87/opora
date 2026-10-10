import { defineMessages } from "./config";

// Раздел «Игры и практики»: список игр, страница раздела, общая обёртка и кнопки итогов.
type Entry = { title: string; hint: string };
type Catalog = Record<
  "bubbles" | "breath" | "light" | "grounding" | "jar" | "garden" | "values" | "what-if" | "strengths" | "letter" | "wheel",
  Entry
>;

const catalogRu: Catalog = {
  bubbles: { title: "Отпустить мысли", hint: "Лопайте пузырьки с тревожными мыслями" },
  breath: { title: "Волна дыхания", hint: "Держите — вдох, отпустите — выдох" },
  light: { title: "Рисовать светом", hint: "Мягкие линии, которые тают сами" },
  grounding: { title: "5-4-3-2-1", hint: "Вернуться в «здесь и сейчас» через пять чувств" },
  jar: { title: "Банка хорошего", hint: "Соберите светлые мелочи этого дня" },
  garden: { title: "Сад камней", hint: "Бороздки на песке и тихие камни" },
  values: { title: "Мои ценности", hint: "Узнайте, что для вас по-настоящему важно" },
  "what-if": { title: "А если бы…", hint: "Карточки с вопросами о себе" },
  strengths: { title: "Мои сильные стороны", hint: "Вспомните, на что в себе можно опереться" },
  letter: { title: "Письмо себе", hint: "Напишите себе через год и запечатайте" },
  wheel: { title: "Колесо жизни", hint: "Как сейчас в разных сферах жизни" },
};

export const gamesMessages = defineMessages({
  ru: {
    catalog: catalogRu,
    page: {
      title: "Игры и практики",
      intro: "Здесь нет очков и проигрышей. Только вы и немного тишины.",
      groups: {
        calm: { title: "Успокоиться", hint: "Несколько минут, чтобы замедлиться и выдохнуть." },
        self: { title: "Найти себя", hint: "Лёгкие упражнения, чтобы лучше услышать себя." },
      },
      forYou: {
        eyebrow: "Для вас",
        title: "Личные игры и советы",
        body1:
          "Собеседник перечитает ваши разговоры и записи в дневнике и соберёт несколько игр и советов именно под вашу ситуацию.",
        body2: "Чем больше вы рассказывали, тем точнее они получатся.",
        heading: "Для вас",
        all: "Советы и всё",
        sub: "Игры, собранные по вашим разговорам и дневнику.",
      },
    },
    shell: { back: "Игры" },
    result: {
      discuss: "Обсудить с собеседником",
      saved: "Сохранено в дневнике",
      saving: "Сохраняем…",
      save: "Сохранить в дневник",
    },
  },
  kk: {
    catalog: {
      bubbles: { title: "Ойларды босату", hint: "Мазасыз ойлары бар көпіршіктерді жарыңыз" },
      breath: { title: "Тыныс толқыны", hint: "Басып тұрыңыз — дем алу, жіберіңіз — дем шығару" },
      light: { title: "Жарықпен салу", hint: "Өздігінен еріп кететін жұмсақ сызықтар" },
      grounding: { title: "5-4-3-2-1", hint: "Бес сезім арқылы «осы жерге, осы сәтке» оралу" },
      jar: { title: "Жақсылық құмырасы", hint: "Бүгінгі күннің жарқын сәттерін жинаңыз" },
      garden: { title: "Тас бағы", hint: "Құмдағы жүйектер мен тыныш тастар" },
      values: { title: "Менің құндылықтарым", hint: "Сіз үшін шынымен не маңызды екенін біліңіз" },
      "what-if": { title: "Егер де…", hint: "Өзіңіз туралы сұрақ карточкалары" },
      strengths: { title: "Менің күшті жақтарым", hint: "Өзіңіздегі сүйенуге болатын қасиеттерді еске алыңыз" },
      letter: { title: "Өзіме хат", hint: "Бір жылдан кейінгі өзіңізге жазып, мөрлеп қойыңыз" },
      wheel: { title: "Өмір дөңгелегі", hint: "Өмірдің әр саласында қазір жағдай қалай" },
    },
    page: {
      title: "Ойындар мен жаттығулар",
      intro: "Мұнда ұпай да, ұтылыс та жоқ. Тек сіз және аздаған тыныштық.",
      groups: {
        calm: { title: "Тынышталу", hint: "Баяулап, еркін дем шығаруға бірнеше минут." },
        self: { title: "Өзіңізді табу", hint: "Өзіңізді жақсырақ есту үшін жеңіл жаттығулар." },
      },
      forYou: {
        eyebrow: "Сізге арналған",
        title: "Жеке ойындар мен кеңестер",
        body1:
          "Әңгімелесуші сіздің сөйлесулеріңіз бен күнделіктегі жазбаларыңызды қайта оқып, дәл сіздің жағдайыңызға сай бірнеше ойын мен кеңес құрастырады.",
        body2: "Неғұрлым көбірек айтқан болсаңыз, соғұрлым дәлірек болады.",
        heading: "Сізге арналған",
        all: "Кеңестер және т.б.",
        sub: "Сөйлесулеріңіз бен күнделігіңіз бойынша құрастырылған ойындар.",
      },
    },
    shell: { back: "Ойындар" },
    result: {
      discuss: "Әңгімелесушімен талқылау",
      saved: "Күнделікке сақталды",
      saving: "Сақталуда…",
      save: "Күнделікке сақтау",
    },
  },
  en: {
    catalog: {
      bubbles: { title: "Let thoughts go", hint: "Pop bubbles that hold anxious thoughts" },
      breath: { title: "Breath wave", hint: "Hold to breathe in, let go to breathe out" },
      light: { title: "Draw with light", hint: "Soft lines that fade on their own" },
      grounding: { title: "5-4-3-2-1", hint: "Come back to the here and now through your five senses" },
      jar: { title: "Jar of good things", hint: "Collect the small bright moments of today" },
      garden: { title: "Rock garden", hint: "Raked sand and quiet stones" },
      values: { title: "My values", hint: "Find out what truly matters to you" },
      "what-if": { title: "What if…", hint: "Question cards about yourself" },
      strengths: { title: "My strengths", hint: "Remember what in you you can lean on" },
      letter: { title: "Letter to myself", hint: "Write to yourself a year from now and seal it" },
      wheel: { title: "Wheel of life", hint: "How things are in different areas of your life" },
    },
    page: {
      title: "Games and practices",
      intro: "No points, no losing. Just you and a little quiet.",
      groups: {
        calm: { title: "Calm down", hint: "A few minutes to slow down and breathe out." },
        self: { title: "Find yourself", hint: "Light exercises to hear yourself a little better." },
      },
      forYou: {
        eyebrow: "For you",
        title: "Personal games and tips",
        body1:
          "Your companion will reread your conversations and journal entries and put together a few games and tips for your situation.",
        body2: "The more you've shared, the better they'll fit.",
        heading: "For you",
        all: "Tips and more",
        sub: "Games put together from your conversations and journal.",
      },
    },
    shell: { back: "Games" },
    result: {
      discuss: "Talk it over",
      saved: "Saved to journal",
      saving: "Saving…",
      save: "Save to journal",
    },
  },
});
