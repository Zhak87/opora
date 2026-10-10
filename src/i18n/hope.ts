import { defineMessages } from "./config";

// Раздел «Надежда», практика «Три хороших вещи» и дыхательная пауза.
export const hope = defineMessages({
  ru: {
    title: "Надежда",
    intro: "Тихое место, чтобы вспомнить, на что можно опереться.",
    thoughtToday: "Мысль на сегодня",
    talkImportant: "Поговорить о важном",
    talkImportantHint: "О будущем, смысле и вашем пути.",
    threeGood: "Три хороших вещи",
    threeGoodHint: "Короткая практика благодарности. Вспомните три вещи, даже совсем небольшие, которые сегодня были хорошими.",
    reflections: "Размышления",
    questionTitle: "Вопрос для размышления",
    questionPrompt: (q: string) => `Хочу подумать над вопросом: «${q}»`,
    thinkTogether: "Подумать вместе",
  },
  kk: {
    title: "Үміт",
    intro: "Неге сүйенуге болатынын еске алатын тыныш орын.",
    thoughtToday: "Бүгінгі ой",
    talkImportant: "Маңызды нәрсе туралы сөйлесу",
    talkImportantHint: "Болашақ, мән және сіздің жолыңыз туралы.",
    threeGood: "Үш жақсы нәрсе",
    threeGoodHint: "Алғыс айтудың қысқа жаттығуы. Бүгін болған үш жақсы нәрсені, тіпті кішкентай болса да, еске түсіріңіз.",
    reflections: "Толғаныстар",
    questionTitle: "Ойлануға арналған сұрақ",
    questionPrompt: (q: string) => `Мына сұрақ туралы ойланғым келеді: «${q}»`,
    thinkTogether: "Бірге ойланайық",
  },
  en: {
    title: "Hope",
    intro: "A quiet place to remember what you can lean on.",
    thoughtToday: "Thought for today",
    talkImportant: "Talk about what matters",
    talkImportantHint: "About the future, meaning and your path.",
    threeGood: "Three good things",
    threeGoodHint: "A short gratitude practice. Think of three things, even very small ones, that were good today.",
    reflections: "Reflections",
    questionTitle: "A question to reflect on",
    questionPrompt: (q: string) => `I'd like to think about this question: “${q}”`,
    thinkTogether: "Think it through together",
  },
});

export const hopeGratitude = defineMessages({
  ru: {
    thanks: "Спасибо, что заметили хорошее.",
    savedInJournal: "Запись сохранена в дневнике.",
    again: "Записать ещё",
    header: "Три хороших вещи сегодня:",
    placeholders: ["Что-то маленькое и приятное", "Кто-то, кто был рядом", "Что получилось у вас"],
    saving: "Сохраняем…",
    save: "Сохранить в дневник",
  },
  kk: {
    thanks: "Жақсылықты байқағаныңызға рахмет.",
    savedInJournal: "Жазба күнделікке сақталды.",
    again: "Тағы жазу",
    header: "Бүгінгі үш жақсы нәрсе:",
    placeholders: ["Кішкентай әрі жағымды бір нәрсе", "Қасыңызда болған біреу", "Сізде не сәтті шықты"],
    saving: "Сақталуда…",
    save: "Күнделікке сақтау",
  },
  en: {
    thanks: "Thank you for noticing the good.",
    savedInJournal: "Saved to your journal.",
    again: "Write more",
    header: "Three good things today:",
    placeholders: ["Something small and pleasant", "Someone who was there for you", "Something that went well"],
    saving: "Saving…",
    save: "Save to journal",
  },
});

export const hopeBreathe = defineMessages({
  ru: {
    label: "Дыхательная пауза",
    inhale: "Вдох",
    hold: "Задержка",
    exhale: "Выдох",
    follow: "Просто следуйте за кругом.",
    done: "Хорошо. Можно вернуться к разговору, когда будете готовы.",
    back: "Вернуться",
  },
  kk: {
    label: "Тыныс алу үзілісі",
    inhale: "Дем алу",
    hold: "Ұстап тұру",
    exhale: "Дем шығару",
    follow: "Шеңбердің ырғағына ілесіңіз.",
    done: "Жақсы. Дайын болғанда әңгімеге қайта орала аласыз.",
    back: "Оралу",
  },
  en: {
    label: "Breathing pause",
    inhale: "Breathe in",
    hold: "Hold",
    exhale: "Breathe out",
    follow: "Just follow the circle.",
    done: "Good. You can return to the conversation whenever you're ready.",
    back: "Go back",
  },
});
