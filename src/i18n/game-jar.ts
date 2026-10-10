import { defineMessages } from "./config";

// Игра «Банка хорошего».
export const jarMessages = defineMessages({
  ru: {
    count: (n: number) => `В банке: ${n}`,
    empty: "Банка пока пуста",
    label: "Что хорошего было",
    placeholder: "Что хорошего было сегодня?",
    button: "В банку",
    note: "Подойдёт любая мелочь: вкусный чай, чья-то улыбка, минута тишины.",
    journal: (list: string) => `Банка хорошего:\n${list}`,
    prompt: (list: string) =>
      `Я собрал(а) банку хорошего:\n${list}\nПомоги мне заметить, что это говорит обо мне и что меня поддерживает.`,
  },
  kk: {
    count: (n: number) => `Құмырада: ${n}`,
    empty: "Құмыра әзірге бос",
    label: "Не жақсы болды",
    placeholder: "Бүгін не жақсы болды?",
    button: "Құмыраға",
    note: "Кез келген ұсақ нәрсе жарайды: дәмді шай, біреудің жымиысы, бір минут тыныштық.",
    journal: (list: string) => `Жақсылық құмырасы:\n${list}`,
    prompt: (list: string) =>
      `Мен жақсылық құмырасын жинадым:\n${list}\nБұл мен туралы не айтатынын және мені не қолдайтынын байқауға көмектесші.`,
  },
  en: {
    count: (n: number) => `In the jar: ${n}`,
    empty: "The jar is empty for now",
    label: "What was good",
    placeholder: "What was good today?",
    button: "Add",
    note: "Any small thing counts: a good cup of tea, someone's smile, a minute of quiet.",
    journal: (list: string) => `Jar of good things:\n${list}`,
    prompt: (list: string) =>
      `I filled a jar of good things:\n${list}\nHelp me notice what this says about me and what supports me.`,
  },
});
