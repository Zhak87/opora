import { defineMessages } from "./config";

type TopicText = { title: string; hint: string; opener: string };

// Переводы тем (название, подсказка и первая реплика собеседника). Русские тексты — в src/lib/topics.ts.
export const TOPIC_TEXTS: Record<"kk" | "en", Record<string, TopicText>> = {
  kk: {
    anxiety: {
      title: "Алаңдаушылық",
      hint: "Іштей тыныштық болмағанда",
      opener:
        "Алаңдаушылық қатты шаршатуы мүмкін, әсіресе ол басылмай қойғанда. Асықпайық. Дәл қазір өзіңізден не байқап тұрсыз: ойыңыздан, денеңізден?",
    },
    loneliness: {
      title: "Жалғыздық",
      hint: "Бөлісетін ешкім болмағанда",
      opener:
        "Келгеніңізге рахмет. Жалғыздық әртүрлі сезілуі мүмкін. Сізде ол қандай: тыныш әрі үйреншікті ме, әлде дәл қазіргідей өткір ме?",
    },
    fatigue: {
      title: "Шаршау",
      hint: "Күш әрең қалғанда",
      opener: "Қазір күшіңіз аз сияқты. Мұнда ешқайда асығудың қажеті жоқ. Айтыңызшы, сізді ең көп не шаршатты?",
    },
    motivation: {
      title: "Ынта жоқ",
      hint: "Ештеңеге құлқыңыз болмағанда",
      opener:
        "Кейде ештеңе істегіңіз келмейді, бұл сізде бірдеңе дұрыс емес дегенді білдірмейді. Бірге түсініп көрейік. Соңғы рет бір нәрсеге аздап болса да қызығушылықты қашан сезіндіңіз?",
    },
    relationships: {
      title: "Қарым-қатынас",
      hint: "Жақындар, жар, отбасы",
      opener: "Жақын адамдармен қарым-қатынас әрі демеу, әрі жара болуы мүмкін. Кім туралы сөйлескіңіз келеді?",
    },
    future: {
      title: "Болашақ қорқынышы",
      hint: "Ертеңгі күн қорқытқанда",
      opener:
        "Болашақ туралы ойлау қорқынышты болуы мүмкін, әсіресе көп нәрсе белгісіз кезде. Алдағы күндер туралы ойлағанда сізді қазір ең көп не алаңдатады?",
    },
    uncertainty: {
      title: "Белгісіздік",
      hint: "Әрі қарай не боларын білмегенде",
      opener: "Белгісіздікке төзу қиын. Аздап анықтап көрейік. Қазір сіз үшін ең түсініксіз нәрсе не?",
    },
    "self-esteem": {
      title: "Өзін-өзі бағалау",
      hint: "Өзімді басқалардан төмен сезінгенде",
      opener:
        "Кейде ішкі дауысымыз бізге тым қатал болады. Қандай сәттерде өзіңізді «жеткілікті жақсы емеспін» деп жиі сезінесіз?",
    },
    stress: {
      title: "Күйзеліс пен ашу",
      hint: "Бәрі ашуға тигенде",
      opener: "Шиеленіс жиналғанда ұсақ нәрселердің өзі ашуға тие бастайды. Қазір сізді ең қатты не ашуландырып жүр?",
    },
    work: {
      title: "Жұмыс және оқу",
      hint: "Жүктеме, қақтығыс, таңдау",
      opener:
        "Жұмыс пен оқу өмірдің көп бөлігін алады, сондықтан ондағы қиындықтар барлық жерде сезіледі. Қазір не болып жатыр?",
    },
    grief: {
      title: "Айырылу мен қоштасу",
      hint: "Біреу қасыңызда болмай қалғанда",
      opener: "Мұны бастан өткеріп жатқаныңызға қатты өкінемін. Қаласаңыз, кімнен немесе неден айырылғаныңызды айтып беріңіз.",
    },
    family: {
      title: "Отбасы және балалар",
      hint: "Ата-ана, балалар, жақындар",
      opener:
        "Отбасында бәрі ерекше қатты сезіледі, өйткені бұлар — ең жақын адамдар. Отбасыңыздағы кім туралы сөйлескіңіз келеді?",
    },
    sleep: {
      title: "Ұйқы және дене",
      hint: "Ұйқысыздық, шиеленіс, денсаулық",
      opener: "Дене демалмағанда бәрі ауырлай түседі. Қазір ұйқыңыз бен хал-жағдайыңыз қалай?",
    },
    path: {
      title: "Өз жолыңды іздеу",
      hint: "Мен кіммін және қайда барамын",
      opener:
        "Өз жолыңыз туралы сұрақ — ең маңызды сұрақтардың бірі. Мұнда жауапты бірден білудің қажеті жоқ. Бұл туралы қазір ойлануыңызға не себеп болды?",
    },
    faith: {
      title: "Сенім мен үміт",
      hint: "Неге сүйенуге болады",
      opener: "Үміт кейде әбден бәсеңдеп кетеді, бірақ мүлде жоғалуы сирек. Қазір сіз үшін үміт нені білдіреді?",
    },
  },
  en: {
    anxiety: {
      title: "Anxiety",
      hint: "When you can't settle inside",
      opener:
        "Anxiety can be exhausting, especially when it won't let go. Let's not rush. What do you notice in yourself right now, in your thoughts or in your body?",
    },
    loneliness: {
      title: "Loneliness",
      hint: "When there's no one to share with",
      opener:
        "Thank you for coming. Loneliness can feel very different. What is it like for you: quiet and familiar, or sharp, like right now?",
    },
    fatigue: {
      title: "Exhaustion",
      hint: "When you're running on empty",
      opener: "It sounds like you don't have much energy right now. There's no need to hurry here. What has worn you out the most?",
    },
    motivation: {
      title: "No motivation",
      hint: "When nothing feels worth doing",
      opener:
        "Sometimes you just don't feel like doing anything, and that doesn't mean something is wrong with you. Let's figure it out together. When did you last feel even a little interest in something?",
    },
    relationships: {
      title: "Relationships",
      hint: "Loved ones, partner, family",
      opener: "Relationships with the people close to us can both support us and hurt us. Who would you like to talk about?",
    },
    future: {
      title: "Fear of the future",
      hint: "When tomorrow feels scary",
      opener:
        "Thinking about the future can be frightening, especially when so much is unclear. When you think about what lies ahead, what worries you most right now?",
    },
    uncertainty: {
      title: "Uncertainty",
      hint: "When you don't know what's next",
      opener: "Uncertainty is hard to bear. Let's try to bring a little clarity. What feels most unclear to you right now?",
    },
    "self-esteem": {
      title: "Self-esteem",
      hint: "When I feel worse than others",
      opener:
        "Sometimes our inner voice can be very harsh with us. When do you most often feel like you're “not good enough”?",
    },
    stress: {
      title: "Stress and anger",
      hint: "When everything gets on your nerves",
      opener: "When tension builds up, even little things start to get on your nerves. What's getting to you most right now?",
    },
    work: {
      title: "Work and study",
      hint: "Workload, conflicts, choices",
      opener: "Work and study take up so much of life that trouble there can be felt everywhere. What's going on right now?",
    },
    grief: {
      title: "Loss and breakups",
      hint: "When someone is no longer there",
      opener: "I'm so sorry you're going through this. If you'd like, tell me who or what you've lost.",
    },
    family: {
      title: "Family and kids",
      hint: "Parents, children, loved ones",
      opener:
        "In a family everything feels especially intense, because these are the people closest to us. Who in your family would you like to talk about?",
    },
    sleep: {
      title: "Sleep and body",
      hint: "Insomnia, tension, health",
      opener: "When your body doesn't get to rest, everything feels harder. How are your sleep and your well-being right now?",
    },
    path: {
      title: "Finding your path",
      hint: "Who I am and where I'm going",
      opener:
        "The question of your own path is one of the most important there is. You don't need to know the answer right away. What got you thinking about it now?",
    },
    faith: {
      title: "Faith and hope",
      hint: "Something to lean on",
      opener: "Hope sometimes grows very quiet, but it rarely disappears completely. What does hope mean to you right now?",
    },
  },
};

// Страницы «Разобраться в себе» и список разговоров.
export const topicsPage = defineMessages({
  ru: {
    home: "Главная",
    title: "Разобраться в себе",
    intro: "Выберите то, что ближе всего к вашему состоянию. Мы начнём мягко и будем двигаться в вашем темпе.",
    notFound: "Не нашли своё?",
    justStart: "Просто начните разговор",
  },
  kk: {
    home: "Басты бет",
    title: "Өзіңізді түсіну",
    intro: "Қазіргі күйіңізге ең жақынын таңдаңыз. Жайлап бастап, өз қарқыныңызбен жүреміз.",
    notFound: "Өзіңізге керегін таппадыңыз ба?",
    justStart: "Жай ғана әңгіме бастаңыз",
  },
  en: {
    home: "Home",
    title: "Understand yourself",
    intro: "Choose what feels closest to how you are right now. We'll start gently and move at your pace.",
    notFound: "Didn't find yours?",
    justStart: "Just start a conversation",
  },
});

export const topicsTalk = defineMessages({
  ru: {
    title: "Поговорить",
    intro: "Здесь можно говорить о чём угодно. Без спешки и без оценок.",
    newConversation: "Начать новый разговор",
    chooseTopic: "Выбрать тему",
    yourConversations: "Ваши разговоры",
    modes: { talk: "Разговор", hope: "Надежда", journal: "Дневник" } as Record<string, string>,
    conversation: "Разговор",
    delete: "Удалить разговор",
    empty: "Здесь будут ваши разговоры. К любому из них можно будет вернуться.",
  },
  kk: {
    title: "Сөйлесу",
    intro: "Мұнда кез келген нәрсе туралы сөйлесуге болады. Асықпай, бағаламай.",
    newConversation: "Жаңа әңгіме бастау",
    chooseTopic: "Тақырып таңдау",
    yourConversations: "Сіздің әңгімелеріңіз",
    modes: { talk: "Әңгіме", hope: "Үміт", journal: "Күнделік" },
    conversation: "Әңгіме",
    delete: "Әңгімені жою",
    empty: "Мұнда сіздің әңгімелеріңіз болады. Олардың кез келгеніне қайта оралуға болады.",
  },
  en: {
    title: "Talk",
    intro: "You can talk about anything here. No rush, no judgment.",
    newConversation: "Start a new conversation",
    chooseTopic: "Choose a topic",
    yourConversations: "Your conversations",
    modes: { talk: "Conversation", hope: "Hope", journal: "Journal" },
    conversation: "Conversation",
    delete: "Delete conversation",
    empty: "Your conversations will appear here. You can come back to any of them.",
  },
});
