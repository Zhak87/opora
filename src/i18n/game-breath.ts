import { defineMessages } from "./config";

// Игра «Волна дыхания».
export const breathMessages = defineMessages({
  ru: {
    ready: "Можно отпускать",
    inhale: "Вдох…",
    exhale: "Выдох…",
    start: "Нажмите и держите",
    again: "Снова вдох",
    aria: "Держите для вдоха, отпустите для выдоха",
    count: (n: number) => `Вдохов: ${n}`,
    done: "Хорошо. Заметьте, как вы чувствуете себя сейчас.",
    tip: "Вдох около 4 секунд, выдох чуть дольше. Без спешки.",
  },
  kk: {
    ready: "Енді жіберуге болады",
    inhale: "Дем алу…",
    exhale: "Дем шығару…",
    start: "Басып, ұстап тұрыңыз",
    again: "Қайта дем алыңыз",
    aria: "Дем алу үшін басып тұрыңыз, дем шығару үшін жіберіңіз",
    count: (n: number) => `Дем алу саны: ${n}`,
    done: "Жақсы. Қазір өзіңізді қалай сезініп тұрғаныңызды байқаңыз.",
    tip: "Шамамен 4 секунд дем алып, сәл ұзағырақ шығарыңыз. Асықпаңыз.",
  },
  en: {
    ready: "You can let go",
    inhale: "Breathe in…",
    exhale: "Breathe out…",
    start: "Press and hold",
    again: "Breathe in again",
    aria: "Hold to breathe in, release to breathe out",
    count: (n: number) => `Breaths: ${n}`,
    done: "Good. Notice how you feel right now.",
    tip: "Breathe in for about 4 seconds, out a little longer. No rush.",
  },
});
