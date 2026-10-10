import { defineMessages } from "./config";

// Игра «Мои сильные стороны».
export const strengthsMessages = defineMessages({
  ru: {
    strengths: [
      "Доброта", "Терпение", "Честность", "Упорство", "Чувство юмора", "Любопытство", "Смелость", "Заботливость",
      "Ответственность", "Креативность", "Спокойствие", "Умение слушать", "Надёжность", "Оптимизм", "Трудолюбие", "Щедрость",
      "Внимательность", "Гибкость", "Справедливость", "Умение прощать", "Организованность", "Чуткость", "Скромность", "Жизнелюбие",
    ],
    pickHint: (n: number) =>
      `Выберите три качества, которые точно есть в вас. Не самые «правильные», а настоящие. Выбрано: ${n} из 3`,
    next: "Дальше",
    skip: "Пропустить",
    progress: (i: number, n: number) => `${i} из ${n}`,
    recall: "Вспомните случай, когда это качество помогло вам или кому-то рядом.",
    placeholder: "Однажды я…",
    resultTitle: "Ваши сильные стороны",
    reflect: "Когда будет трудно, вспомните: эти качества уже не раз выручали вас. Они никуда не делись.",
    journal: (text: string) => `Мои сильные стороны:\n${text}`,
    prompt: (text: string) =>
      `Я прошёл(а) упражнение «Мои сильные стороны». Вот что получилось:\n${text}\nПомоги мне понять, как опираться на эти качества в том, что сейчас происходит в моей жизни.`,
    restart: "Пройти заново",
  },
  kk: {
    strengths: [
      "Мейірімділік", "Шыдамдылық", "Адалдық", "Табандылық", "Әзілқойлық", "Білуге құмарлық", "Батылдық", "Қамқорлық",
      "Жауапкершілік", "Шығармашылық", "Сабырлылық", "Тыңдай білу", "Сенімді болу", "Үміттілік", "Еңбекқорлық", "Жомарттық",
      "Зейінділік", "Икемділік", "Әділдік", "Кешіре білу", "Тәртіптілік", "Сезімталдық", "Қарапайымдылық", "Өмірге құштарлық",
    ],
    pickHint: (n: number) =>
      `Сізде анық бар үш қасиетті таңдаңыз. Ең «дұрыстарын» емес, шынайыларын. Таңдалды: ${n} / 3`,
    next: "Әрі қарай",
    skip: "Өткізіп жіберу",
    progress: (i: number, n: number) => `${i} / ${n}`,
    recall: "Бұл қасиет сізге немесе жаныңыздағы біреуге көмектескен бір жағдайды еске түсіріңіз.",
    placeholder: "Бірде мен…",
    resultTitle: "Сіздің күшті жақтарыңыз",
    reflect: "Қиын сәтте есіңізге алыңыз: бұл қасиеттер сізді талай рет құтқарған. Олар әлі де сізбен бірге.",
    journal: (text: string) => `Менің күшті жақтарым:\n${text}`,
    prompt: (text: string) =>
      `Мен «Менің күшті жақтарым» жаттығуын орындадым. Нәтижесі мынадай:\n${text}\nҚазір өмірімде болып жатқан жағдайда осы қасиеттерге қалай сүйенуге болатынын түсінуге көмектесші.`,
    restart: "Қайта бастау",
  },
  en: {
    strengths: [
      "Kindness", "Patience", "Honesty", "Persistence", "Sense of humor", "Curiosity", "Courage", "Caring",
      "Responsibility", "Creativity", "Calm", "Listening well", "Reliability", "Optimism", "Hard work", "Generosity",
      "Attentiveness", "Flexibility", "Fairness", "Forgiveness", "Being organized", "Sensitivity", "Modesty", "Love of life",
    ],
    pickHint: (n: number) =>
      `Choose three qualities you know you have. Not the most "proper" ones, the real ones. Chosen: ${n} of 3`,
    next: "Next",
    skip: "Skip",
    progress: (i: number, n: number) => `${i} of ${n}`,
    recall: "Recall a time when this quality helped you or someone close to you.",
    placeholder: "Once I…",
    resultTitle: "Your strengths",
    reflect: "When things get hard, remember: these qualities have come through for you before. They haven't gone anywhere.",
    journal: (text: string) => `My strengths:\n${text}`,
    prompt: (text: string) =>
      `I did the "My strengths" exercise. Here's what came out:\n${text}\nHelp me see how I can lean on these qualities in what's going on in my life right now.`,
    restart: "Start over",
  },
});
