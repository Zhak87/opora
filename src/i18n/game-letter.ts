import { defineMessages } from "./config";

// Игра «Письмо себе».
export const letterMessages = defineMessages({
  ru: {
    prompts: [
      "Что сейчас происходит в вашей жизни?",
      "Чего вы боитесь и на что надеетесь?",
      "Что вы хотите пожелать себе через год?",
      "За что вы можете поблагодарить себя уже сейчас?",
    ],
    sealMark: "О",
    sealed: "Письмо запечатано",
    sealedBody: "Сохраните его в дневник. Через год, а может и раньше, перечитайте и посмотрите, какой путь вы прошли.",
    journal: (date: string, text: string) => `Письмо себе через год (написано ${date}):\n\n${text}`,
    prompt: (text: string) => `Я написал(а) письмо себе через год:\n\n${text}\n\nХочу поговорить о том, что я в нём заметил(а).`,
    back: "Вернуться к письму",
    greeting: "Дорогой(ая) я через год,",
    placeholder: "Пишите как другу. Никто, кроме вас, это не прочитает.",
    aria: "Текст письма",
    hint: "Подсказка:",
    another: "другая",
    seal: "Запечатать письмо",
  },
  kk: {
    prompts: [
      "Қазір өміріңізде не болып жатыр?",
      "Неден қорқасыз және неге үміттенесіз?",
      "Бір жылдан кейінгі өзіңізге не тілейсіз?",
      "Өзіңізге дәл қазірдің өзінде не үшін алғыс айта аласыз?",
    ],
    sealMark: "О",
    sealed: "Хат мөрленді",
    sealedBody:
      "Оны күнделікке сақтаңыз. Бір жылдан кейін, бәлкім ертерек, қайта оқып, қандай жолдан өткеніңізді көріңіз.",
    journal: (date: string, text: string) => `Бір жылдан кейінгі өзіме хат (${date} жазылған):\n\n${text}`,
    prompt: (text: string) =>
      `Мен бір жылдан кейінгі өзіме хат жаздым:\n\n${text}\n\nОнда өзім байқаған нәрселер туралы сөйлескім келеді.`,
    back: "Хатқа оралу",
    greeting: "Бір жылдан кейінгі қымбатты өзім,",
    placeholder: "Досыңызға жазғандай жазыңыз. Мұны сізден басқа ешкім оқымайды.",
    aria: "Хат мәтіні",
    hint: "Ой салар сұрақ:",
    another: "басқасы",
    seal: "Хатты мөрлеу",
  },
  en: {
    prompts: [
      "What's happening in your life right now?",
      "What are you afraid of, and what do you hope for?",
      "What would you like to wish yourself a year from now?",
      "What can you thank yourself for already?",
    ],
    sealMark: "O",
    sealed: "The letter is sealed",
    sealedBody: "Save it to your journal. In a year, or maybe sooner, read it again and see how far you've come.",
    journal: (date: string, text: string) => `Letter to myself a year from now (written ${date}):\n\n${text}`,
    prompt: (text: string) =>
      `I wrote a letter to myself a year from now:\n\n${text}\n\nI'd like to talk about what I noticed in it.`,
    back: "Back to the letter",
    greeting: "Dear me, a year from now,",
    placeholder: "Write as you would to a friend. No one but you will read this.",
    aria: "Letter text",
    hint: "Prompt:",
    another: "another",
    seal: "Seal the letter",
  },
});
