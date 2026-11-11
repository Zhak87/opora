import { defineMessages } from "./config";

// «Мне нужно выговориться»: человек выбирает, чего хочет, и разговор начинается с подходящего вопроса.
// openers читает и сервер (startConversation), поэтому ключи закрыты: heard | sort | step.
export const talkOutMessages = defineMessages({
  ru: {
    title: "Чего вам сейчас хочется?",
    hint: "Можно поменять в любой момент, просто скажите об этом в разговоре.",
    modes: {
      heard: { label: "Просто быть услышанным", text: "Без советов и разборов. Чтобы кто-то выслушал." },
      sort: { label: "Разобраться в ситуации", text: "Вместе собрать мысли и посмотреть со стороны." },
      step: { label: "Найти следующий шаг", text: "Понять, что можно сделать уже сегодня." },
    },
    voiceTip: "В разговоре можно говорить голосом: нажмите на микрофон.",
    begin: "Начать разговор",
    openers: {
      heard: "Я здесь, чтобы просто выслушать. Без советов, если вы сами их не попросите. Что сейчас происходит в вашей жизни?",
      sort: "Давайте разберёмся вместе, не торопясь. Расскажите, что сейчас происходит в вашей жизни? С чего всё началось?",
      step: "Давайте найдём один небольшой шаг, который вам по силам. Но сначала расскажите: что сейчас происходит в вашей жизни?",
    },
    convTitle: "Выговориться",
  },
  kk: {
    title: "Қазір сізге не керек?",
    hint: "Кез келген сәтте өзгертуге болады, сөйлесу кезінде жай айтыңыз.",
    modes: {
      heard: { label: "Жай тыңдалу", text: "Кеңессіз және талдаусыз. Біреу тыңдап отырсын." },
      sort: { label: "Жағдайды түсіну", text: "Бірге ойды жинап, сырттан қарау." },
      step: { label: "Келесі қадамды табу", text: "Бүгіннің өзінде не істеуге болатынын түсіну." },
    },
    voiceTip: "Сөйлесуде дауыспен айтуға болады: микрофонды басыңыз.",
    begin: "Сөйлесуді бастау",
    openers: {
      heard: "Мен сізді жай тыңдау үшін осындамын. Өзіңіз сұрамасаңыз, кеңессіз. Қазір өміріңізде не болып жатыр?",
      sort: "Асықпай, бірге түсініп көрейік. Айтыңызшы, қазір өміріңізде не болып жатыр? Бәрі неден басталды?",
      step: "Шамаңыз келетін бір шағын қадамды табайық. Бірақ алдымен айтыңызшы: қазір өміріңізде не болып жатыр?",
    },
    convTitle: "Сөйлеп алу",
  },
  en: {
    title: "What do you want right now?",
    hint: "You can change it any time, just say so in the conversation.",
    modes: {
      heard: { label: "Just be heard", text: "No advice, no analysis. Just someone listening." },
      sort: { label: "Make sense of it", text: "Gather your thoughts together and look from the side." },
      step: { label: "Find the next step", text: "Figure out what you can do today." },
    },
    voiceTip: "You can talk by voice in the conversation: tap the microphone.",
    begin: "Start talking",
    openers: {
      heard: "I'm here just to listen. No advice unless you ask for it. What's going on in your life right now?",
      sort: "Let's work through it together, no rush. Tell me, what's going on in your life right now? How did it start?",
      step: "Let's find one small step you can manage. But first, tell me: what's going on in your life right now?",
    },
    convTitle: "Talking it out",
  },
});
