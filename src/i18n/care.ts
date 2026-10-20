import { defineMessages, plural } from "./config";

// Сторона клиента: приглашение, согласия, «Мой психолог», журнал доступа. И общие подписи профиля специалиста.
type Scope = "wellbeing" | "goals" | "ai_chats" | "journal" | "analytics";

export const careMessages = defineMessages<{
  navItem: string;
  scopes: Record<Scope, { title: string; text: string }>;
  invite: {
    eyebrow: string;
    invalid: string;
    invalidHint: string;
    toHome: string;
    signupCta: string;
    signinCta: string;
    accountHint: string;
    ownInvite: string;
    already: string;
    open: string;
    connectTitle: string;
    connectLead: string;
    chooseShare: string;
    shareHint: string;
    always: string;
    understand: string;
    yourName: string;
    yourNameHint: string;
    submit: string;
    submitting: string;
    failed: string;
  };
  profile: {
    years: (n: number) => string;
    perSession: (minutes: number) => string;
    verified: string;
    education: string;
    approach: string;
    about: string;
    languages: string;
    formats: string;
    notAccepting: string;
    connect: string;
  };
  care: {
    title: string;
    intro: string;
    emptyTitle: string;
    emptyText: string;
    emptyHint: string;
    since: (d: string) => string;
    pending: string;
    shareTitle: string;
    shareIntro: string;
    privateTitle: string;
    privateText: string;
    end: string;
    endConfirm: string;
    ended: string;
    joined: string;
    logTitle: string;
    logEmpty: string;
    noTraining: string;
    aiNote: string;
  };
  actions: Record<string, string>;
  whatViewed: Record<string, string>;
  by: { you: string; psychologist: string; client: string; admin: string };
}>({
  ru: {
    navItem: "Психолог",
    scopes: {
      wellbeing: { title: "Самочувствие", text: "Ваши отметки настроения и самооценки, их динамика" },
      goals: { title: "Цели", text: "Цели, которые вы ставите, и отметки о прогрессе" },
      journal: { title: "Дневник", text: "Записи дневника" },
      ai_chats: { title: "Разговоры с ИИ", text: "Переписка с ИИ-собеседником в «Опоре»" },
      analytics: {
        title: "ИИ-аналитика для психолога",
        text: "ИИ готовит для психолога обзор тем и динамики только по тому, чем вы разрешили делиться. Это вспомогательная сводка, не диагноз",
      },
    },
    invite: {
      eyebrow: "Приглашение от специалиста",
      invalid: "Ссылка не работает",
      invalidHint: "Возможно, специалист её отключил или его анкета ещё на проверке. Попросите новую ссылку.",
      toHome: "На главную",
      signupCta: "Создать аккаунт и продолжить",
      signinCta: "У меня есть аккаунт",
      accountHint: "Чтобы работать со специалистом, нужен аккаунт «Опоры». После входа вы вернётесь сюда.",
      ownInvite: "Это ваша собственная ссылка. Так её увидит клиент.",
      already: "Вы уже работаете с этим специалистом.",
      open: "Открыть",
      connectTitle: "Подключиться к специалисту",
      connectLead: "Вы сможете писать специалисту и записываться на встречи. Всё остальное он увидит, только если вы разрешите.",
      chooseShare: "Чем делиться",
      shareHint: "Можно изменить в любой момент в разделе «Психолог».",
      always: "Специалист всегда видит ваше имя, переписку с ним и ваши записи на встречи.",
      understand:
        "Понимаю, что «Опора» — не медицинская организация, специалист несёт ответственность за свою работу, а ИИ-аналитика — вспомогательный инструмент и не ставит диагнозов.",
      yourName: "Как к вам обращаться",
      yourNameHint: "Это имя увидит специалист.",
      submit: "Подключиться",
      submitting: "Подключаем…",
      failed: "Не получилось подключиться. Попробуйте ещё раз.",
    },
    profile: {
      years: (n) => `Опыт ${n} ${plural("ru", n, { one: "год", few: "года", many: "лет" })}`,
      perSession: (min) => `за сессию ${min} мин`,
      verified: "Образование проверено",
      education: "Образование",
      approach: "Подход",
      about: "О себе",
      languages: "Языки",
      formats: "Формат",
      notAccepting: "Сейчас не принимает новых клиентов",
      connect: "Начать работу",
    },
    care: {
      title: "Мой психолог",
      intro: "Здесь вы управляете тем, что видит ваш специалист.",
      emptyTitle: "Специалист рядом, когда он нужен",
      emptyText:
        "«Опора» остаётся вашим личным пространством. Если захотите работать с психологом, он сможет пригласить вас по ссылке, а скоро здесь появится каталог проверенных специалистов.",
      emptyHint: "Подключение никак не ограничит то, чем вы пользуетесь сейчас.",
      since: (d) => `Работаете вместе с ${d}`,
      pending: "Ждёт подтверждения специалиста",
      shareTitle: "Что видит специалист",
      shareIntro: "Включите то, чем хотите делиться. Выключенное специалист перестаёт видеть сразу.",
      privateTitle: "Только для вас",
      privateText: "Всё, что не включено выше, видите только вы. Данные не используются для обучения ИИ.",
      end: "Завершить работу со специалистом",
      endConfirm: "Завершить работу? Специалист сразу потеряет доступ ко всем вашим данным. История в «Опоре» останется у вас.",
      ended: "Работа завершена, доступ закрыт.",
      joined: "Готово, вы подключились к специалисту.",
      logTitle: "Журнал доступа",
      logEmpty: "Пока ничего не происходило.",
      noTraining: "Ваши данные не используются для обучения ИИ.",
      aiNote: "ИИ-аналитика помогает специалисту подготовиться к встрече. Она отделяет ваши слова от предположений и не ставит диагнозов; решения принимает специалист.",
    },
    actions: {
      "link.created": "Подключение к специалисту",
      "link.ended": "Работа завершена",
      "consent.granted": "Разрешён доступ",
      "consent.revoked": "Доступ закрыт",
      "client.viewed": "Специалист открыл",
      "psychologist.submitted": "Анкета отправлена на проверку",
      "psychologist.reviewed": "Решение по анкете",
    },
    whatViewed: { card: "карточку", analytics: "аналитику", journal: "дневник", ai_chats: "разговоры с ИИ" },
    by: { you: "вы", psychologist: "специалист", client: "клиент", admin: "администратор" },
  },
  kk: {
    navItem: "Психолог",
    scopes: {
      wellbeing: { title: "Көңіл күй", text: "Көңіл күй белгілеріңіз бен өзін-өзі бағалау, олардың динамикасы" },
      goals: { title: "Мақсаттар", text: "Қойған мақсаттарыңыз және ілгерілеу белгілері" },
      journal: { title: "Күнделік", text: "Күнделік жазбалары" },
      ai_chats: { title: "ЖИ-мен әңгімелер", text: "«Опорадағы» ЖИ-әңгімелесушімен хат алмасу" },
      analytics: {
        title: "Психологқа арналған ЖИ-аналитика",
        text: "ЖИ психологқа тек сіз рұқсат берген деректер бойынша тақырыптар мен динамикаға шолу дайындайды. Бұл көмекші қорытынды, диагноз емес",
      },
    },
    invite: {
      eyebrow: "Маманнан шақыру",
      invalid: "Сілтеме жұмыс істемейді",
      invalidHint: "Маман оны өшірген болуы мүмкін немесе сауалнамасы әлі тексерілуде. Жаңа сілтеме сұраңыз.",
      toHome: "Басты бетке",
      signupCta: "Аккаунт ашып, жалғастыру",
      signinCta: "Менде аккаунт бар",
      accountHint: "Маманмен жұмыс істеу үшін «Опора» аккаунты керек. Кіргеннен кейін осында ораласыз.",
      ownInvite: "Бұл өз сілтемеңіз. Клиент оны осылай көреді.",
      already: "Сіз бұл маманмен жұмыс істеп жүрсіз.",
      open: "Ашу",
      connectTitle: "Маманға қосылу",
      connectLead: "Маманға жаза аласыз және кездесуге жазыла аласыз. Қалғанын тек сіз рұқсат етсеңіз ғана көреді.",
      chooseShare: "Немен бөлісу",
      shareHint: "Кез келген уақытта «Психолог» бөлімінде өзгертуге болады.",
      always: "Маман әрқашан атыңызды, онымен хат алмасуды және кездесуге жазылуларыңызды көреді.",
      understand:
        "«Опора» медициналық ұйым емес екенін, маман өз жұмысына жауап беретінін, ал ЖИ-аналитика көмекші құрал екенін және диагноз қоймайтынын түсінемін.",
      yourName: "Сізге қалай жүгінейік",
      yourNameHint: "Бұл атты маман көреді.",
      submit: "Қосылу",
      submitting: "Қосылуда…",
      failed: "Қосылу мүмкін болмады. Қайталап көріңіз.",
    },
    profile: {
      years: (n) => `Тәжірибесі ${n} жыл`,
      perSession: (min) => `${min} минуттық сессия`,
      verified: "Білімі тексерілген",
      education: "Білімі",
      approach: "Тәсілі",
      about: "Өзі туралы",
      languages: "Тілдер",
      formats: "Формат",
      notAccepting: "Қазір жаңа клиенттерді қабылдамайды",
      connect: "Жұмысты бастау",
    },
    care: {
      title: "Менің психологым",
      intro: "Мұнда маманыңыздың нені көретінін басқарасыз.",
      emptyTitle: "Маман қажет кезде жаныңызда",
      emptyText:
        "«Опора» сіздің жеке кеңістігіңіз болып қала береді. Психологпен жұмыс істегіңіз келсе, ол сізді сілтеме арқылы шақыра алады, ал жақында мұнда тексерілген мамандар каталогы пайда болады.",
      emptyHint: "Қосылу қазір қолданып жүрген мүмкіндіктеріңізді шектемейді.",
      since: (d) => `${d} бастап бірге жұмыс істейсіз`,
      pending: "Маманның растауын күтуде",
      shareTitle: "Маман нені көреді",
      shareIntro: "Бөліскіңіз келетінін қосыңыз. Өшірілгенді маман бірден көрмей қалады.",
      privateTitle: "Тек сізге",
      privateText: "Жоғарыда қосылмағанның бәрін тек сіз көресіз. Деректер ЖИ-ді оқытуға пайдаланылмайды.",
      end: "Маманмен жұмысты аяқтау",
      endConfirm: "Жұмысты аяқтайсыз ба? Маман барлық деректеріңізге қолжетімділікті бірден жоғалтады. «Опорадағы» тарих өзіңізде қалады.",
      ended: "Жұмыс аяқталды, қолжетімділік жабылды.",
      joined: "Дайын, маманға қосылдыңыз.",
      logTitle: "Қолжетімділік журналы",
      logEmpty: "Әзірге ештеңе болған жоқ.",
      noTraining: "Деректеріңіз ЖИ-ді оқытуға пайдаланылмайды.",
      aiNote: "ЖИ-аналитика маманға кездесуге дайындалуға көмектеседі. Ол сөздеріңізді болжамнан ажыратады және диагноз қоймайды; шешімді маман қабылдайды.",
    },
    actions: {
      "link.created": "Маманға қосылу",
      "link.ended": "Жұмыс аяқталды",
      "consent.granted": "Қолжетімділік берілді",
      "consent.revoked": "Қолжетімділік жабылды",
      "client.viewed": "Маман ашты",
      "psychologist.submitted": "Сауалнама тексеруге жіберілді",
      "psychologist.reviewed": "Сауалнама бойынша шешім",
    },
    whatViewed: { card: "картаны", analytics: "аналитиканы", journal: "күнделікті", ai_chats: "ЖИ-мен әңгімелерді" },
    by: { you: "сіз", psychologist: "маман", client: "клиент", admin: "әкімші" },
  },
  en: {
    navItem: "Psychologist",
    scopes: {
      wellbeing: { title: "Wellbeing", text: "Your mood check-ins and self-ratings, and how they change" },
      goals: { title: "Goals", text: "Goals you set and progress notes" },
      journal: { title: "Journal", text: "Journal entries" },
      ai_chats: { title: "AI conversations", text: "Your conversations with the AI companion in Opora" },
      analytics: {
        title: "AI insights for the psychologist",
        text: "The AI prepares an overview of themes and trends for your psychologist, only from what you allow to share. It's a support summary, not a diagnosis",
      },
    },
    invite: {
      eyebrow: "Invitation from a specialist",
      invalid: "This link doesn't work",
      invalidHint: "The specialist may have disabled it, or their profile is still under review. Ask for a new link.",
      toHome: "Go home",
      signupCta: "Create an account and continue",
      signinCta: "I have an account",
      accountHint: "To work with a specialist you need an Opora account. You'll come back here after signing in.",
      ownInvite: "This is your own link. This is how a client sees it.",
      already: "You already work with this specialist.",
      open: "Open",
      connectTitle: "Connect with the specialist",
      connectLead: "You'll be able to message them and book sessions. They see anything else only if you allow it.",
      chooseShare: "What to share",
      shareHint: "You can change this any time in the Psychologist section.",
      always: "The specialist always sees your name, your messages with them and your session bookings.",
      understand:
        "I understand Opora is not a medical organisation, the specialist is responsible for their work, and AI insights are a support tool that never makes diagnoses.",
      yourName: "What should we call you",
      yourNameHint: "The specialist will see this name.",
      submit: "Connect",
      submitting: "Connecting…",
      failed: "Couldn't connect. Please try again.",
    },
    profile: {
      years: (n) => `${n} ${plural("en", n, { one: "year", other: "years" })} of experience`,
      perSession: (min) => `per ${min}-minute session`,
      verified: "Education verified",
      education: "Education",
      approach: "Approach",
      about: "About",
      languages: "Languages",
      formats: "Format",
      notAccepting: "Not taking new clients right now",
      connect: "Start working together",
    },
    care: {
      title: "My psychologist",
      intro: "Here you control what your specialist can see.",
      emptyTitle: "A specialist, when you need one",
      emptyText:
        "Opora stays your personal space. If you'd like to work with a psychologist, they can invite you by link, and a directory of verified specialists is coming here soon.",
      emptyHint: "Connecting doesn't limit anything you use now.",
      since: (d) => `Working together since ${d}`,
      pending: "Waiting for the specialist to confirm",
      shareTitle: "What your specialist sees",
      shareIntro: "Turn on what you want to share. Anything turned off is hidden from them immediately.",
      privateTitle: "Only for you",
      privateText: "Everything not turned on above is visible only to you. Your data is not used to train AI.",
      end: "End work with this specialist",
      endConfirm: "End work? The specialist immediately loses access to all your data. Your history in Opora stays with you.",
      ended: "Work ended, access closed.",
      joined: "Done, you're connected with the specialist.",
      logTitle: "Access log",
      logEmpty: "Nothing has happened yet.",
      noTraining: "Your data is not used to train AI.",
      aiNote: "AI insights help the specialist prepare for a session. They separate your words from guesses and never diagnose; the specialist makes the decisions.",
    },
    actions: {
      "link.created": "Connected with specialist",
      "link.ended": "Work ended",
      "consent.granted": "Access granted",
      "consent.revoked": "Access closed",
      "client.viewed": "Specialist opened",
      "psychologist.submitted": "Profile sent for review",
      "psychologist.reviewed": "Profile decision",
    },
    whatViewed: { card: "your card", analytics: "insights", journal: "journal", ai_chats: "AI conversations" },
    by: { you: "you", psychologist: "specialist", client: "client", admin: "administrator" },
  },
});

export const adminMessages = defineMessages({
  ru: {
    title: "Проверка анкет",
    intro: "Публикуйте только тех, чьё образование подтверждено документами.",
    tabs: { pending: "На проверке", approved: "Опубликованы", rejected: "Отклонены", suspended: "Приостановлены", draft: "Черновики" },
    empty: "Здесь пусто.",
    documents: "Документы",
    noDocuments: "Документов нет",
    note: "Комментарий для специалиста",
    approve: "Опубликовать",
    reject: "Вернуть на доработку",
    suspend: "Приостановить",
    forbidden: "Раздел доступен только администраторам.",
    submitted: "Отправлена",
  },
  kk: {
    title: "Сауалнамаларды тексеру",
    intro: "Тек білімі құжатпен расталғандарды жариялаңыз.",
    tabs: { pending: "Тексерілуде", approved: "Жарияланған", rejected: "Қайтарылған", suspended: "Тоқтатылған", draft: "Жобалар" },
    empty: "Мұнда бос.",
    documents: "Құжаттар",
    noDocuments: "Құжат жоқ",
    note: "Маманға пікір",
    approve: "Жариялау",
    reject: "Түзетуге қайтару",
    suspend: "Тоқтату",
    forbidden: "Бөлім тек әкімшілерге қолжетімді.",
    submitted: "Жіберілді",
  },
  en: {
    title: "Profile review",
    intro: "Publish only those whose education is confirmed by documents.",
    tabs: { pending: "Under review", approved: "Published", rejected: "Returned", suspended: "Suspended", draft: "Drafts" },
    empty: "Nothing here.",
    documents: "Documents",
    noDocuments: "No documents",
    note: "Comment for the specialist",
    approve: "Publish",
    reject: "Return for changes",
    suspend: "Suspend",
    forbidden: "Only administrators can open this section.",
    submitted: "Submitted",
  },
});
