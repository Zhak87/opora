import { defineMessages } from "./config";

// Игра «Колесо жизни». Сферы во всех языках идут в одном порядке (цвета заданы в компоненте).
export const wheelMessages = defineMessages({
  ru: {
    choose: "Какую сферу хочется улучшить?",
    chooseHint: "Не обязательно самую низкую. Ту, куда сейчас хочется направить силы.",
    thinking: "Собираю вопросы и первые шаги…",
    questionsTitle: "Вопросы для размышления",
    stepsTitle: "Возможные первые шаги",
    toOneStep: "Выбрать шаг на 24 часа",
    areas: ["Здоровье", "Отношения", "Семья", "Работа и дело", "Отдых", "Развитие", "Финансы", "Внутренний покой"],
    aria: "Колесо жизни",
    see: "Посмотреть итог",
    high: (name: string) => `Больше всего опоры сейчас в сфере «${name}».`,
    low: (name: string) =>
      `Меньше всего сил получает «${name}». Это не оценка вас — просто подсказка, куда можно направить немного внимания. Какой самый маленький шаг мог бы добавить туда один балл?`,
    prompt: (summary: string, low: string) =>
      `Я заполнил(а) «Колесо жизни». Мои оценки: ${summary}. Меньше всего — «${low}». Помоги мне подумать, какой небольшой шаг я могу сделать.`,
    journal: (summary: string) => `Колесо жизни. ${summary}.`,
    edit: "Изменить оценки",
  },
  kk: {
    choose: "Қай саланы жақсартқыңыз келеді?",
    chooseHint: "Ең төменгісі болуы міндетті емес. Қазір күш бағыттағыңыз келетінін.",
    thinking: "Сұрақтар мен алғашқы қадамдарды жинап жатырмын…",
    questionsTitle: "Ойлануға сұрақтар",
    stepsTitle: "Мүмкін алғашқы қадамдар",
    toOneStep: "24 сағатқа қадам таңдау",
    areas: ["Денсаулық", "Қарым-қатынас", "Отбасы", "Жұмыс пен кәсіп", "Демалыс", "Даму", "Қаржы", "Ішкі тыныштық"],
    aria: "Өмір дөңгелегі",
    see: "Қорытындыны көру",
    high: (name: string) => `Қазір ең көп тірек — «${name}» саласында.`,
    low: (name: string) =>
      `Ең аз күш «${name}» саласына бөлінуде. Бұл сізге берілген баға емес, тек назарыңызды аздап қайда бағыттауға болатынын көрсетеді. Онда бір ұпай қосу үшін қандай ең кішкентай қадам жасауға болар еді?`,
    prompt: (summary: string, low: string) =>
      `Мен «Өмір дөңгелегін» толтырдым. Менің бағаларым: ${summary}. Ең төменгісі — «${low}». Қандай шағын қадам жасай алатынымды ойлап көруге көмектесші.`,
    journal: (summary: string) => `Өмір дөңгелегі. ${summary}.`,
    edit: "Бағаларды өзгерту",
  },
  en: {
    choose: "Which area would you like to improve?",
    chooseHint: "Not necessarily the lowest. The one where you want to put your energy now.",
    thinking: "Gathering questions and first steps…",
    questionsTitle: "Questions to reflect on",
    stepsTitle: "Possible first steps",
    toOneStep: "Pick a step for 24 hours",
    areas: ["Health", "Relationships", "Family", "Work and career", "Rest", "Growth", "Finances", "Inner peace"],
    aria: "Wheel of life",
    see: "See the result",
    high: (name: string) => `Right now you have the most support in "${name}".`,
    low: (name: string) =>
      `"${name}" is getting the least energy. This isn't a judgment of you, just a hint about where a little attention could go. What's the smallest step that could add one point there?`,
    prompt: (summary: string, low: string) =>
      `I filled in the "Wheel of life". My ratings: ${summary}. The lowest is "${low}". Help me think about a small step I could take.`,
    journal: (summary: string) => `Wheel of life. ${summary}.`,
    edit: "Change ratings",
  },
});
