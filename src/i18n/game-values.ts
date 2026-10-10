import { defineMessages } from "./config";

// Игра «Мои ценности».
export const valuesMessages = defineMessages({
  ru: {
    values: [
      "Семья", "Свобода", "Творчество", "Здоровье", "Любовь", "Развитие", "Покой", "Честность",
      "Дружба", "Природа", "Вера", "Приключения", "Знания", "Помощь другим", "Красота", "Стабильность",
      "Признание", "Юмор", "Независимость", "Смысл", "Справедливость", "Достаток", "Дом", "Доброта",
    ],
    progress: (i: number, n: number) => `${i} из ${n}`,
    forMe: "Для меня это…",
    no: "Не очень",
    yes: "Важно",
    tip: "Отвечайте быстро, по первому чувству.",
    manyTitle: "Важного оказалось много — это хорошо.",
    pickHint: (n: number) => `Теперь выберите три самых главных. Выбрано: ${n} из 3`,
    done: "Готово",
    resultTitle: "Ваши главные ценности",
    reflect:
      "Подумайте: сколько места эти ценности занимают в вашей жизни сейчас? Иногда тревога и усталость появляются, когда мы живём далеко от того, что нам по-настоящему важно.",
    prompt: (list: string) =>
      `Я прошёл(а) упражнение «Мои ценности». Мои главные ценности: ${list}. Помоги мне подумать, насколько моя жизнь сейчас им соответствует.`,
    journal: (list: string) => `Мои главные ценности: ${list}.`,
    restart: "Пройти заново",
  },
  kk: {
    values: [
      "Отбасы", "Еркіндік", "Шығармашылық", "Денсаулық", "Махаббат", "Даму", "Тыныштық", "Адалдық",
      "Достық", "Табиғат", "Сенім", "Шытырман оқиғалар", "Білім", "Басқаларға көмек", "Сұлулық", "Тұрақтылық",
      "Мойындалу", "Әзіл-қалжың", "Тәуелсіздік", "Мағына", "Әділдік", "Молшылық", "Үй", "Мейірімділік",
    ],
    progress: (i: number, n: number) => `${i} / ${n}`,
    forMe: "Мен үшін бұл…",
    no: "Онша емес",
    yes: "Маңызды",
    tip: "Алғашқы сезіміңізге сүйеніп, тез жауап беріңіз.",
    manyTitle: "Маңызды нәрсе көп болып шықты — бұл жақсы.",
    pickHint: (n: number) => `Енді ең бастысы деген үшеуін таңдаңыз. Таңдалды: ${n} / 3`,
    done: "Дайын",
    resultTitle: "Сіздің басты құндылықтарыңыз",
    reflect:
      "Ойланып көріңіз: бұл құндылықтар қазір өміріңізде қаншалықты орын алады? Кейде мазасыздық пен шаршау өзімізге шынымен маңызды нәрседен алыстап кеткенде пайда болады.",
    prompt: (list: string) =>
      `Мен «Менің құндылықтарым» жаттығуын орындадым. Менің басты құндылықтарым: ${list}. Қазіргі өмірімнің оларға қаншалықты сай келетінін ойлап көруге көмектесші.`,
    journal: (list: string) => `Менің басты құндылықтарым: ${list}.`,
    restart: "Қайта бастау",
  },
  en: {
    values: [
      "Family", "Freedom", "Creativity", "Health", "Love", "Growth", "Peace", "Honesty",
      "Friendship", "Nature", "Faith", "Adventure", "Knowledge", "Helping others", "Beauty", "Stability",
      "Recognition", "Humor", "Independence", "Meaning", "Fairness", "Prosperity", "Home", "Kindness",
    ],
    progress: (i: number, n: number) => `${i} of ${n}`,
    forMe: "To me, this is…",
    no: "Not really",
    yes: "Important",
    tip: "Answer quickly, with your first feeling.",
    manyTitle: "A lot turned out to matter, and that's good.",
    pickHint: (n: number) => `Now choose the three that matter most. Chosen: ${n} of 3`,
    done: "Done",
    resultTitle: "Your core values",
    reflect:
      "Consider how much room these values have in your life right now. Sometimes anxiety and tiredness show up when we live far from what truly matters to us.",
    prompt: (list: string) =>
      `I did the "My values" exercise. My core values are: ${list}. Help me think about how well my life right now lines up with them.`,
    journal: (list: string) => `My core values: ${list}.`,
    restart: "Start over",
  },
});
