import { defineMessages } from "./config";

// Политика конфиденциальности, условия использования и согласие на обработку данных.
// Тексты подготовлены как основа и должны быть проверены юристом перед запуском.
// operator и contact приходят из настроек сервера (OPORA_OPERATOR, OPORA_CONTACT_EMAIL).

type Section = { h: string; p: string[] };
type Who = { operator: string; contact: string };
// Фраза из трёх частей: текст до ссылки, текст ссылки, текст после.
type Linked = [string, string, string];

export const legalMessages = defineMessages<{
  updated: string;
  privacyTitle: string;
  termsTitle: string;
  privacy: (w: Who) => Section[];
  terms: (w: Who) => Section[];
  defaultOperator: string;
  defaultContact: string;
  draftNote: string;
  consent: {
    title: string;
    subtitle: string;
    personalData: Linked;
    adult: Linked;
    required: string;
    submit: string;
    submitting: string;
    decline: string;
    failed: string;
  };
  demoNote: Linked;
  links: { privacy: string; terms: string };
}>({
  ru: {
    updated: "Редакция от 10 октября 2026 года",
    privacyTitle: "Политика конфиденциальности",
    termsTitle: "Условия использования",
    defaultOperator: "владелец сервиса «Опора»",
    defaultContact: "через раздел «Профиль» в приложении",
    draftNote: "",
    privacy: ({ operator, contact }) => [
      {
        h: "1. Кто обрабатывает ваши данные",
        p: [
          `Оператор персональных данных — ${operator}. По вопросам, связанным с вашими данными, можно обратиться: ${contact}.`,
          "Политика составлена с учётом Закона Республики Казахстан «О персональных данных и их защите».",
        ],
      },
      {
        h: "2. Какие данные мы собираем",
        p: [
          "Данные аккаунта: адрес почты, пароль (хранится только в виде необратимого хеша), имя или обращение, если вы его укажете.",
          "Содержание: тексты разговоров с ИИ-собеседником, записи дневника, личный план и отметки о его выполнении, настройки голоса.",
          "Голос: в голосовом режиме запись вашей речи передаётся на распознавание и не сохраняется. Сохраняется только распознанный текст как сообщение разговора.",
          "Технические данные: выбранный язык (cookie), данные сессии входа (cookie), IP-адрес и сведения о браузере в журналах хостинга.",
          "В разговорах и дневнике вы можете рассказывать о своём состоянии, здоровье, отношениях и других личных вещах. Это особенно чувствительные сведения: пишите только то, чем готовы поделиться, и не указывайте данные других людей без необходимости.",
        ],
      },
      {
        h: "3. Зачем мы их обрабатываем",
        p: [
          "Чтобы работал ваш аккаунт: вход, восстановление доступа, сохранение и продолжение разговоров, дневник.",
          "Чтобы ИИ-собеседник мог ответить с учётом контекста разговора, а по вашей просьбе — с учётом записей дневника.",
          "Чтобы защищать сервис от злоупотреблений и сбоев.",
          "Мы не продаём ваши данные, не используем их для рекламы и не показываем их другим пользователям.",
        ],
      },
      {
        h: "4. Кому передаются данные и где они хранятся",
        p: [
          "Supabase (база данных и вход в аккаунт) — серверы во Франкфурте, Германия.",
          "Vercel (хостинг приложения) — обработка запросов во Франкфурте, Германия.",
          "Google (Gemini API) — получает текст текущего разговора, а для голосового режима — запись речи или текст для озвучивания, чтобы сформировать ответ. Обработка может происходить за пределами Казахстана, в том числе в США.",
          "Таким образом ваши данные передаются и хранятся за пределами Республики Казахстан. Давая согласие при регистрации, вы соглашаетесь на такую трансграничную передачу.",
          "Мы раскрываем данные государственным органам только в случаях, прямо предусмотренных законом.",
        ],
      },
      {
        h: "5. Как долго хранятся данные",
        p: [
          "Пока существует ваш аккаунт. Отдельный разговор или запись можно удалить в любой момент.",
          "В «Профиле» можно удалить всю историю или весь аккаунт. Данные удаляются из рабочей базы сразу; в резервных копиях хостинга они могут оставаться ограниченное время, после чего удаляются автоматически.",
          "Пробный разговор без регистрации хранится только в вашем браузере и отправляется на сервер лишь для получения ответа ИИ.",
        ],
      },
      {
        h: "6. Ваши права",
        p: [
          "Знать, какие данные о вас обрабатываются, и получить к ним доступ.",
          "Исправить или дополнить данные, удалить их, отозвать согласие на обработку. Отозвать согласие можно, удалив аккаунт в «Профиле» или написав нам; после этого пользоваться аккаунтом будет нельзя.",
          "Обжаловать действия оператора в уполномоченном органе в сфере защиты персональных данных или в суде.",
        ],
      },
      {
        h: "7. Как мы защищаем данные",
        p: [
          "Соединение с сайтом и между сервисами шифруется (HTTPS/TLS). Каждый пользователь технически имеет доступ только к своим записям: это проверяется на уровне базы данных.",
          "Пароли не хранятся в открытом виде. Доступ к управлению сервисом ограничен.",
          "Если произойдёт утечка, мы уведомим уполномоченный орган и пострадавших пользователей в сроки, установленные законом.",
        ],
      },
      {
        h: "8. Возраст",
        p: ["Сервис предназначен для людей старше 18 лет. Если вам меньше 18, пожалуйста, не создавайте аккаунт."],
      },
      {
        h: "9. Cookie",
        p: [
          "Мы используем только необходимые cookie: для входа в аккаунт и для запоминания языка. Рекламных и аналитических cookie нет.",
        ],
      },
      {
        h: "10. Изменения политики",
        p: [
          "Если мы существенно изменим политику, мы попросим вас заново подтвердить согласие при следующем входе.",
        ],
      },
    ],
    terms: ({ operator, contact }) => [
      {
        h: "1. Что такое «Опора»",
        p: [
          `«Опора» — сервис для поддержки и саморефлексии с ИИ-собеседником. Сервис предоставляет ${operator}.`,
          "Собеседник в приложении — это искусственный интеллект, а не человек. Его ответы создаются автоматически и могут быть неточными или неподходящими.",
        ],
      },
      {
        h: "2. Это не медицинская помощь",
        p: [
          "«Опора» не оказывает медицинских и психологических услуг, не ставит диагнозов и не заменяет врача, психолога или психотерапевта.",
          "Если вам или кому-то рядом угрожает опасность, звоните 112. Телефон доверия в Казахстане — 150.",
        ],
      },
      {
        h: "3. Кто может пользоваться",
        p: ["Сервисом могут пользоваться люди старше 18 лет. Создавая аккаунт, вы подтверждаете, что вам есть 18 лет."],
      },
      {
        h: "4. Ваш аккаунт",
        p: [
          "Не передавайте пароль другим людям. Если вы подозреваете, что кто-то получил доступ к аккаунту, смените пароль через «Забыли пароль?».",
          "Вы можете в любой момент удалить историю или весь аккаунт в разделе «Профиль».",
        ],
      },
      {
        h: "5. Что нельзя делать",
        p: [
          "Пытаться получить доступ к чужим данным, нарушать работу сервиса, автоматически отправлять большое количество запросов.",
          "Использовать сервис для действий, нарушающих закон или права других людей.",
          "При нарушении этих правил доступ к аккаунту может быть ограничен.",
        ],
      },
      {
        h: "6. Ответственность",
        p: [
          "Сервис предоставляется бесплатно и «как есть». Мы стараемся, чтобы он работал стабильно, но не можем гарантировать отсутствие перерывов и ошибок.",
          "Решения, которые вы принимаете после разговора с ИИ, остаются вашими. В пределах, разрешённых законом, мы не несём ответственности за последствия использования ответов ИИ.",
        ],
      },
      {
        h: "7. Персональные данные",
        p: ["Как мы обращаемся с вашими данными, описано в Политике конфиденциальности."],
      },
      {
        h: "8. Изменения и применимое право",
        p: [
          "Мы можем обновлять условия. О существенных изменениях сообщим в приложении.",
          `К условиям применяется право Республики Казахстан. Связаться с нами: ${contact}.`,
        ],
      },
    ],
    consent: {
      title: "Пара слов о ваших данных",
      subtitle: "Чтобы продолжить, подтвердите, пожалуйста, согласие. Это нужно один раз.",
      personalData: [
        "Даю согласие на сбор и обработку моих персональных данных, включая тексты разговоров и дневника, и на их передачу и хранение за пределами Казахстана, как описано в ",
        "Политике конфиденциальности",
        ".",
      ],
      adult: ["Мне есть 18 лет, я принимаю ", "Условия использования", " и понимаю, что собеседник здесь — ИИ, а не специалист."],
      required: "Чтобы продолжить, отметьте оба пункта.",
      submit: "Продолжить",
      submitting: "Сохраняем…",
      decline: "Не согласен(на), выйти",
      failed: "Не получилось сохранить. Попробуйте ещё раз.",
    },
    demoNote: [
      "Это ИИ, а не специалист. Отправляя сообщение, вы принимаете ",
      "условия и политику конфиденциальности",
      ". Не пишите имя, адрес и другие данные, по которым вас можно узнать.",
    ],
    links: { privacy: "Конфиденциальность", terms: "Условия" },
  },
  kk: {
    updated: "2026 жылғы 10 қазандағы редакция",
    privacyTitle: "Құпиялылық саясаты",
    termsTitle: "Пайдалану шарттары",
    defaultOperator: "«Опора» сервисінің иесі",
    defaultContact: "қосымшадағы «Профиль» бөлімі арқылы",
    draftNote: "Қазақ тіліндегі нұсқа ақпарат үшін берілген; түсіндіруде айырмашылық болса, орыс тіліндегі нұсқа басым болады.",
    privacy: ({ operator, contact }) => [
      {
        h: "1. Деректеріңізді кім өңдейді",
        p: [
          `Дербес деректер операторы — ${operator}. Деректеріңізге қатысты сұрақтар бойынша хабарласуға болады: ${contact}.`,
          "Саясат Қазақстан Республикасының «Дербес деректер және оларды қорғау туралы» Заңын ескере отырып жасалды.",
        ],
      },
      {
        h: "2. Қандай деректер жинаймыз",
        p: [
          "Аккаунт деректері: пошта мекенжайы, құпиясөз (тек қайтымсыз хеш түрінде сақталады), көрсетсеңіз — есіміңіз немесе сізге қалай жүгіну керектігі.",
          "Мазмұн: ЖИ-сұхбаттасушымен әңгімелер мәтіні, күнделік жазбалары, жеке жоспар және оның орындалу белгілері, дауыс баптаулары.",
          "Дауыс: дауыстық режимде сөзіңіздің жазбасы тануға жіберіледі және сақталмайды. Тек танылған мәтін әңгіменің хабарламасы ретінде сақталады.",
          "Техникалық деректер: таңдалған тіл (cookie), кіру сессиясының деректері (cookie), хостинг журналдарындағы IP-мекенжай және браузер туралы мәлімет.",
          "Әңгімелер мен күнделікте өз жағдайыңыз, денсаулығыңыз, қарым-қатынастарыңыз және басқа да жеке нәрселер туралы айтуыңыз мүмкін. Бұл аса сезімтал мәліметтер: тек бөлісуге дайын нәрсені жазыңыз және қажетсіз басқа адамдардың деректерін көрсетпеңіз.",
        ],
      },
      {
        h: "3. Оларды не үшін өңдейміз",
        p: [
          "Аккаунтыңыз жұмыс істеуі үшін: кіру, қолжетімділікті қалпына келтіру, әңгімелерді сақтау және жалғастыру, күнделік.",
          "ЖИ-сұхбаттасушы әңгіменің мәнмәтінін, ал сіздің өтінішіңіз бойынша күнделік жазбаларын ескеріп жауап беруі үшін.",
          "Сервисті теріс пайдаланудан және іркілістерден қорғау үшін.",
          "Деректеріңізді сатпаймыз, жарнамаға пайдаланбаймыз және басқа пайдаланушыларға көрсетпейміз.",
        ],
      },
      {
        h: "4. Деректер кімге беріледі және қайда сақталады",
        p: [
          "Supabase (дерекқор және аккаунтқа кіру) — серверлер Германияның Франкфурт қаласында.",
          "Vercel (қосымша хостингі) — сұраныстар Германияның Франкфурт қаласында өңделеді.",
          "Google (Gemini API) — жауап құру үшін ағымдағы әңгіменің мәтінін, ал дауыстық режимде сөз жазбасын немесе дыбыстауға арналған мәтінді алады. Өңдеу Қазақстаннан тыс жерде, соның ішінде АҚШ-та жүргізілуі мүмкін.",
          "Осылайша деректеріңіз Қазақстан Республикасынан тыс жерге беріледі және сонда сақталады. Тіркелу кезінде келісім бере отырып, сіз осындай трансшекаралық беруге келісесіз.",
          "Деректерді мемлекеттік органдарға тек заңда тікелей көзделген жағдайларда ашамыз.",
        ],
      },
      {
        h: "5. Деректер қанша уақыт сақталады",
        p: [
          "Аккаунтыңыз бар болғанша. Жеке әңгімені немесе жазбаны кез келген уақытта жоюға болады.",
          "«Профиль» бөлімінде бүкіл тарихты немесе бүкіл аккаунтты жоюға болады. Деректер жұмыс дерекқорынан бірден жойылады; хостингтің резервтік көшірмелерінде олар шектеулі уақыт қалуы мүмкін, содан кейін автоматты түрде жойылады.",
          "Тіркелусіз сынақ әңгіме тек браузеріңізде сақталады және серверге тек ЖИ жауабын алу үшін жіберіледі.",
        ],
      },
      {
        h: "6. Сіздің құқықтарыңыз",
        p: [
          "Сіз туралы қандай деректер өңделетінін білу және оларға қол жеткізу.",
          "Деректерді түзету немесе толықтыру, жою, өңдеуге берілген келісімді кері қайтарып алу. Келісімді «Профильде» аккаунтты жою арқылы немесе бізге жазу арқылы кері қайтаруға болады; осыдан кейін аккаунтты пайдалану мүмкін болмайды.",
          "Оператордың әрекеттеріне дербес деректерді қорғау саласындағы уәкілетті органға немесе сотқа шағымдану.",
        ],
      },
      {
        h: "7. Деректерді қалай қорғаймыз",
        p: [
          "Сайтпен және сервистер арасындағы байланыс шифрланады (HTTPS/TLS). Әр пайдаланушының техникалық тұрғыда тек өз жазбаларына қолжетімділігі бар: бұл дерекқор деңгейінде тексеріледі.",
          "Құпиясөздер ашық түрде сақталмайды. Сервисті басқаруға қолжетімділік шектелген.",
          "Деректер жылыстаған жағдайда уәкілетті органды және зардап шеккен пайдаланушыларды заңда белгіленген мерзімде хабардар етеміз.",
        ],
      },
      {
        h: "8. Жас шектеуі",
        p: ["Сервис 18 жастан асқан адамдарға арналған. Егер сізге 18 жас толмаса, аккаунт ашпаңызшы."],
      },
      {
        h: "9. Cookie",
        p: [
          "Біз тек қажетті cookie файлдарын қолданамыз: аккаунтқа кіру және тілді есте сақтау үшін. Жарнамалық және талдау cookie файлдары жоқ.",
        ],
      },
      {
        h: "10. Саясаттың өзгеруі",
        p: ["Саясатты елеулі түрде өзгертсек, келесі кіруіңізде келісіміңізді қайта растауды сұраймыз."],
      },
    ],
    terms: ({ operator, contact }) => [
      {
        h: "1. «Опора» дегеніміз не",
        p: [
          `«Опора» — ЖИ-сұхбаттасушымен қолдау және өзін-өзі тануға арналған сервис. Сервисті ${operator} ұсынады.`,
          "Қосымшадағы сұхбаттасушы — адам емес, жасанды интеллект. Оның жауаптары автоматты түрде жасалады және дәл емес немесе орынсыз болуы мүмкін.",
        ],
      },
      {
        h: "2. Бұл медициналық көмек емес",
        p: [
          "«Опора» медициналық және психологиялық қызметтер көрсетпейді, диагноз қоймайды және дәрігердің, психологтың немесе психотерапевтің орнын баспайды.",
          "Егер сізге немесе жаныңыздағы біреуге қауіп төнсе, 112-ге қоңырау шалыңыз. Қазақстандағы сенім телефоны — 150.",
        ],
      },
      {
        h: "3. Кім пайдалана алады",
        p: ["Сервисті 18 жастан асқан адамдар пайдалана алады. Аккаунт ашу арқылы сіз 18 жасқа толғаныңызды растайсыз."],
      },
      {
        h: "4. Сіздің аккаунтыңыз",
        p: [
          "Құпиясөзді басқа адамдарға бермеңіз. Аккаунтқа біреу кірді деп күдіктенсеңіз, «Құпиясөзді ұмыттыңыз ба?» арқылы құпиясөзді ауыстырыңыз.",
          "«Профиль» бөлімінде кез келген уақытта тарихты немесе бүкіл аккаунтты жоюға болады.",
        ],
      },
      {
        h: "5. Не істеуге болмайды",
        p: [
          "Басқа адамдардың деректеріне қол жеткізуге тырысу, сервистің жұмысын бұзу, автоматты түрде көп сұраныс жіберу.",
          "Сервисті заңды немесе басқа адамдардың құқықтарын бұзатын әрекеттерге пайдалану.",
          "Осы ережелер бұзылған жағдайда аккаунтқа қолжетімділік шектелуі мүмкін.",
        ],
      },
      {
        h: "6. Жауапкершілік",
        p: [
          "Сервис тегін және «сол күйінде» ұсынылады. Біз оның тұрақты жұмыс істеуіне тырысамыз, бірақ үзілістер мен қателердің болмайтынына кепілдік бере алмаймыз.",
          "ЖИ-мен сөйлескеннен кейін қабылдаған шешімдеріңіз өзіңізге тиесілі. Заң рұқсат еткен шекте біз ЖИ жауаптарын пайдалану салдары үшін жауап бермейміз.",
        ],
      },
      {
        h: "7. Дербес деректер",
        p: ["Деректеріңізді қалай өңдейтініміз Құпиялылық саясатында сипатталған."],
      },
      {
        h: "8. Өзгерістер және қолданылатын құқық",
        p: [
          "Шарттарды жаңартуымыз мүмкін. Елеулі өзгерістер туралы қосымшада хабарлаймыз.",
          `Шарттарға Қазақстан Республикасының құқығы қолданылады. Бізбен байланыс: ${contact}.`,
        ],
      },
    ],
    consent: {
      title: "Деректеріңіз туралы бірер сөз",
      subtitle: "Жалғастыру үшін келісіміңізді растаңызшы. Бұл бір рет қана керек.",
      personalData: [
        "Әңгімелер мен күнделік мәтіндерін қоса алғанда, дербес деректерімді жинауға және өңдеуге, сондай-ақ оларды Қазақстаннан тыс жерге беруге және сонда сақтауға келісім беремін; бұл ",
        "Құпиялылық саясатында",
        " сипатталған.",
      ],
      adult: ["Маған 18 жас толды, мен ", "Пайдалану шарттарын", " қабылдаймын және мұндағы сұхбаттасушы маман емес, ЖИ екенін түсінемін."],
      required: "Жалғастыру үшін екі тармақты да белгілеңіз.",
      submit: "Жалғастыру",
      submitting: "Сақтап жатырмыз…",
      decline: "Келіспеймін, шығу",
      failed: "Сақтау мүмкін болмады. Қайта көріңіз.",
    },
    demoNote: [
      "Бұл маман емес, ЖИ. Хабарлама жіберу арқылы сіз ",
      "шарттар мен құпиялылық саясатын",
      " қабылдайсыз. Есіміңізді, мекенжайыңызды және сізді танып-білуге болатын басқа деректерді жазбаңыз.",
    ],
    links: { privacy: "Құпиялылық", terms: "Шарттар" },
  },
  en: {
    updated: "Version of 10 October 2026",
    privacyTitle: "Privacy policy",
    termsTitle: "Terms of use",
    defaultOperator: "the owner of the Opora service",
    defaultContact: "through the Profile section of the app",
    draftNote: "The English version is provided for information; if the versions differ, the Russian version prevails.",
    privacy: ({ operator, contact }) => [
      {
        h: "1. Who processes your data",
        p: [
          `The personal data operator is ${operator}. For questions about your data, you can reach us ${contact}.`,
          "This policy is written with the Law of the Republic of Kazakhstan “On Personal Data and Their Protection” in mind.",
        ],
      },
      {
        h: "2. What data we collect",
        p: [
          "Account data: email address, password (stored only as an irreversible hash), and your name or how you'd like to be addressed, if you provide it.",
          "Content: your conversations with the AI companion, journal entries, your personal plan and progress marks, voice settings.",
          "Voice: in voice mode, a recording of your speech is sent for recognition and is not stored. Only the recognised text is saved as a message.",
          "Technical data: your chosen language (cookie), sign-in session data (cookie), IP address and browser details in hosting logs.",
          "In conversations and the journal you may share things about your state of mind, health, relationships and other personal matters. This is especially sensitive information: share only what you are comfortable sharing, and avoid including other people's details unless needed.",
        ],
      },
      {
        h: "3. Why we process it",
        p: [
          "To run your account: sign-in, access recovery, saving and continuing conversations, the journal.",
          "So the AI companion can reply with the context of the conversation and, when you ask, your journal entries.",
          "To protect the service from abuse and failures.",
          "We do not sell your data, use it for advertising, or show it to other users.",
        ],
      },
      {
        h: "4. Who receives the data and where it is stored",
        p: [
          "Supabase (database and sign-in): servers in Frankfurt, Germany.",
          "Vercel (app hosting): requests processed in Frankfurt, Germany.",
          "Google (Gemini API): receives the text of the current conversation and, in voice mode, your speech recording or the text to be read aloud, in order to produce a reply. Processing may take place outside Kazakhstan, including in the USA.",
          "This means your data is transferred to and stored outside the Republic of Kazakhstan. By giving consent at sign-up you agree to this cross-border transfer.",
          "We disclose data to public authorities only where the law expressly requires it.",
        ],
      },
      {
        h: "5. How long data is kept",
        p: [
          "For as long as your account exists. You can delete any conversation or entry at any time.",
          "In Profile you can delete all your history or your whole account. Data is removed from the live database immediately; it may remain in hosting backups for a limited time and is then deleted automatically.",
          "A trial conversation without an account is stored only in your browser and is sent to the server only to get the AI's reply.",
        ],
      },
      {
        h: "6. Your rights",
        p: [
          "To know what data about you is processed and to access it.",
          "To correct or complete your data, delete it, and withdraw consent. You can withdraw consent by deleting your account in Profile or by writing to us; after that the account can no longer be used.",
          "To complain about the operator to the authorised personal data protection body or to a court.",
        ],
      },
      {
        h: "7. How we protect data",
        p: [
          "Connections to the site and between services are encrypted (HTTPS/TLS). Each user can technically access only their own records; this is enforced in the database.",
          "Passwords are never stored in plain text. Administrative access to the service is restricted.",
          "If a data breach occurs, we will notify the authorised body and affected users within the time limits set by law.",
        ],
      },
      {
        h: "8. Age",
        p: ["The service is intended for people aged 18 and over. If you are under 18, please do not create an account."],
      },
      {
        h: "9. Cookies",
        p: ["We use only necessary cookies: to keep you signed in and to remember your language. There are no advertising or analytics cookies."],
      },
      {
        h: "10. Changes to this policy",
        p: ["If we change this policy materially, we will ask you to confirm your consent again the next time you sign in."],
      },
    ],
    terms: ({ operator, contact }) => [
      {
        h: "1. What Opora is",
        p: [
          `Opora is a service for support and self-reflection with an AI companion, provided by ${operator}.`,
          "The companion in the app is artificial intelligence, not a person. Its replies are generated automatically and may be inaccurate or unsuitable.",
        ],
      },
      {
        h: "2. This is not medical care",
        p: [
          "Opora does not provide medical or psychological services, does not diagnose, and does not replace a doctor, psychologist or psychotherapist.",
          "If you or someone near you is in danger, call 112. The helpline in Kazakhstan is 150.",
        ],
      },
      {
        h: "3. Who can use it",
        p: ["The service is for people aged 18 and over. By creating an account you confirm that you are at least 18."],
      },
      {
        h: "4. Your account",
        p: [
          "Don't share your password. If you suspect someone has accessed your account, change your password via “Forgot your password?”.",
          "You can delete your history or your whole account at any time in Profile.",
        ],
      },
      {
        h: "5. What is not allowed",
        p: [
          "Trying to access other people's data, disrupting the service, or sending large numbers of automated requests.",
          "Using the service for anything that breaks the law or the rights of others.",
          "If these rules are broken, access to the account may be restricted.",
        ],
      },
      {
        h: "6. Liability",
        p: [
          "The service is free and provided “as is”. We try to keep it running smoothly but cannot guarantee it will be free of interruptions and errors.",
          "Decisions you make after talking with the AI remain your own. To the extent permitted by law, we are not liable for the consequences of using the AI's replies.",
        ],
      },
      {
        h: "7. Personal data",
        p: ["How we handle your data is described in the Privacy policy."],
      },
      {
        h: "8. Changes and governing law",
        p: [
          "We may update these terms. We will let you know about material changes in the app.",
          `These terms are governed by the law of the Republic of Kazakhstan. You can reach us ${contact}.`,
        ],
      },
    ],
    consent: {
      title: "A few words about your data",
      subtitle: "To continue, please confirm your consent. You only need to do this once.",
      personalData: [
        "I consent to the collection and processing of my personal data, including the text of my conversations and journal, and to its transfer and storage outside Kazakhstan, as described in the ",
        "Privacy policy",
        ".",
      ],
      adult: ["I am 18 or older, I accept the ", "Terms of use", ", and I understand that the companion here is an AI, not a professional."],
      required: "Please tick both boxes to continue.",
      submit: "Continue",
      submitting: "Saving…",
      decline: "I don't agree, sign out",
      failed: "Couldn't save. Please try again.",
    },
    demoNote: [
      "This is an AI, not a professional. By sending a message you accept the ",
      "terms and privacy policy",
      ". Please don't include your name, address or other details that could identify you.",
    ],
    links: { privacy: "Privacy", terms: "Terms" },
  },
});
