import { defineMessages } from "./config";

// Блок «Что вам сейчас нужно?» на главной и слова для двух аудиторий на странице входа.
export const needsMessages = defineMessages({
  ru: {
    title: "Что вам сейчас нужно?",
    needs: {
      rest: { title: "Выдохнуть", hint: "Когда тело и голова устали" },
      ground: { title: "Почувствовать опору", hint: "Когда тревожно и всё шатается" },
      together: { title: "Не быть одному", hint: "Когда хочется, чтобы рядом были люди" },
      worth: { title: "Поверить в себя", hint: "Когда кажется, что не справляюсь" },
      self: { title: "Найти себя", hint: "Когда непонятно, чего хочу и куда идти" },
    },
    places: {
      rooms: { title: "Комнаты", hint: "Люди с похожим опытом говорят и слушают" },
      specialists: { title: "Психологи", hint: "Проверенные специалисты, запись на встречу" },
    },
    talk: {
      ground: { title: "Поговорить о тревоге", hint: "Собеседник поможет разложить, что происходит", prompt: "Мне сейчас тревожно, хочу почувствовать опору." },
      together: { title: "Выговориться", hint: "Собеседник выслушает без оценок", prompt: "Мне одиноко, хочу просто выговориться." },
    },
    audiences: {
      step: {
        title: "Начни с одного небольшого шага",
        lead: "Учёба, работа, деньги, будущее: когда всё навалилось сразу, трудно понять, за что браться. Здесь можно спокойно разобраться, что происходит, и выбрать один шаг на сегодня.",
        feelings: ["кто я?", "учёба и работа", "что дальше?", "один шаг"],
      },
      share: {
        title: "Не обязательно держать всё в себе",
        lead: "Отношения, расставание, усталость, перемены в жизни. Здесь можно выговориться без оценок, услышать себя и найти опору: в разговоре, в практиках и рядом с людьми, которые проходят похожее.",
        feelings: ["выговориться", "без оценок", "перемены", "опора"],
      },
    },
  },
  kk: {
    title: "Қазір сізге не керек?",
    needs: {
      rest: { title: "Тыныстап алу", hint: "Дене мен ой шаршағанда" },
      ground: { title: "Тірек сезіну", hint: "Мазасызданып, бәрі шайқалып тұрғанда" },
      together: { title: "Жалғыз қалмау", hint: "Қасыңызда адамдар болғанын қалағанда" },
      worth: { title: "Өзіңізге сену", hint: "Шамам жетпейтіндей көрінгенде" },
      self: { title: "Өзіңізді табу", hint: "Не қалайтыныңыз, қайда барарыңыз түсініксіз болғанда" },
    },
    places: {
      rooms: { title: "Бөлмелер", hint: "Тәжірибесі ұқсас адамдар сөйлесіп, тыңдайды" },
      specialists: { title: "Психологтар", hint: "Тексерілген мамандар, кездесуге жазылу" },
    },
    talk: {
      ground: { title: "Мазасыздық туралы сөйлесу", hint: "Әңгімелесуші не болып жатқанын реттеуге көмектеседі", prompt: "Қазір көңілім алаң, тірек сезінгім келеді." },
      together: { title: "Ішіңізді ақтару", hint: "Әңгімелесуші бағаламай тыңдайды", prompt: "Жалғызсырап тұрмын, жай ғана ішімді ақтарғым келеді." },
    },
    audiences: {
      step: {
        title: "Бір шағын қадамнан баста",
        lead: "Оқу, жұмыс, ақша, болашақ: бәрі бірден үйілгенде, неден бастарды түсіну қиын. Мұнда не болып жатқанын асықпай түсініп, бүгінге бір қадам таңдауға болады.",
        feelings: ["мен кіммін?", "оқу мен жұмыс", "әрі қарай не?", "бір қадам"],
      },
      share: {
        title: "Бәрін ішіңізде сақтау міндетті емес",
        lead: "Қарым-қатынас, айырылысу, шаршау, өмірдегі өзгерістер. Мұнда бағалаусыз ішіңізді ақтарып, өзіңізді естіп, тірек табуға болады: әңгімеде, жаттығуларда және осындайды бастан өткеріп жатқан адамдардың қасында.",
        feelings: ["ішті ақтару", "бағалаусыз", "өзгерістер", "тірек"],
      },
    },
  },
  en: {
    title: "What do you need right now?",
    needs: {
      rest: { title: "Breathe out", hint: "When body and mind are tired" },
      ground: { title: "Feel steady", hint: "When you are anxious and everything is shaky" },
      together: { title: "Not be alone", hint: "When you want people nearby" },
      worth: { title: "Believe in yourself", hint: "When it feels like you can't cope" },
      self: { title: "Find yourself", hint: "When it's unclear what you want and where to go" },
    },
    places: {
      rooms: { title: "Rooms", hint: "People with similar experience talk and listen" },
      specialists: { title: "Psychologists", hint: "Verified specialists, book a session" },
    },
    talk: {
      ground: { title: "Talk about the anxiety", hint: "The companion helps sort out what is going on", prompt: "I feel anxious right now and want to feel steady." },
      together: { title: "Get it off your chest", hint: "The companion listens without judging", prompt: "I feel lonely and just want to talk." },
    },
    audiences: {
      step: {
        title: "Start with one small step",
        lead: "Studies, work, money, the future: when everything piles up at once, it's hard to know where to begin. Here you can calmly sort out what is going on and choose one step for today.",
        feelings: ["who am I?", "study and work", "what's next?", "one step"],
      },
      share: {
        title: "You don't have to keep it all inside",
        lead: "Relationships, a breakup, tiredness, changes in life. Here you can talk it out without being judged, hear yourself and find support: in conversation, in practices and next to people going through something similar.",
        feelings: ["talk it out", "no judgement", "changes", "support"],
      },
    },
  },
});
