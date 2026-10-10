import { defineMessages } from "./config";

// Игра «Отпустить мысли».
export const bubblesMessages = defineMessages({
  ru: {
    popAria: "Лопнуть пузырёк",
    releaseAria: (t: string) => `Отпустить мысль: ${t}`,
    tap: "Коснитесь пузырька",
    released: (n: number) => `Отпущено: ${n}`,
    placeholder: "Напишите мысль, которую хотите отпустить",
    button: "Отпустить",
    note: "Мысль превратится в пузырёк. Когда будете готовы, коснитесь его и отпустите.",
  },
  kk: {
    popAria: "Көпіршікті жару",
    releaseAria: (t: string) => `Ойды босату: ${t}`,
    tap: "Көпіршікке түртіңіз",
    released: (n: number) => `Босатылды: ${n}`,
    placeholder: "Босатқыңыз келетін ойды жазыңыз",
    button: "Босату",
    note: "Ой көпіршікке айналады. Дайын болғанда, оған түртіп, босатыңыз.",
  },
  en: {
    popAria: "Pop the bubble",
    releaseAria: (t: string) => `Let go of the thought: ${t}`,
    tap: "Tap a bubble",
    released: (n: number) => `Let go: ${n}`,
    placeholder: "Write a thought you want to let go of",
    button: "Let go",
    note: "Your thought will turn into a bubble. When you're ready, tap it and let it go.",
  },
});
