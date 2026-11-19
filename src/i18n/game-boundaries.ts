import { defineMessages } from "./config";

// «Мои границы» (флагман по аудиту 19.11.2026): пять жизненных ситуаций, в каждой три хода.
// Вариант ответа: [вид, что вы говорите или делаете, как реагирует другой].
// Виды: 0 уступить, 1 резко, 2 уйти от разговора, 3 спокойно и ясно (src/lib/boundaries.ts).
type Option = [0 | 1 | 2 | 3, string, string];
type Round = { say: string; options: Option[] };
type Scenario = { title: string; text: string; rounds: Round[] };
type Scenarios = Record<"debt" | "work" | "relatives" | "night" | "weekend", Scenario>;
type Endings = Record<"clear" | "yield" | "wall" | "fog" | "mixed", { title: string; text: string }>;

const scenariosRu: Scenarios = {
  debt: {
    title: "Долг",
    text: "Друг снова просит в долг, хотя прошлый ещё не вернул.",
    rounds: [
      { say: "«Слушай, выручи до зарплаты? Очень надо, двадцать тысяч».", options: [
        [0, "«Ладно, переведу»", "«Ты супер! Верну, честно». Прошлый долг так и висит."],
        [1, "«Ты прошлое вообще отдавать собираешься?»", "«Ну ты и злопамятный человек… Я же не специально»."],
        [3, "«Сейчас не смогу. Давай сначала закроем прошлый долг»", "«Ой… Я и забыл про него. Неловко вышло»."],
      ] },
      { say: "«Ну пожалуйста, мне правда больше не у кого попросить».", options: [
        [0, "«Хорошо, но это последний раз»", "«Конечно-конечно!» Звучит знакомо."],
        [2, "Перестать отвечать на сообщения", "Через час: «Ты тут? Ау?» Вопрос никуда не делся."],
        [3, "«Понимаю, что тебе трудно. Деньгами помочь не могу, а подумать, где взять, помогу»", "«Ладно… Давай подумаем вместе»."],
      ] },
      { say: "«Я думал, мы друзья».", options: [
        [0, "«Мы друзья, конечно. Держи»", "«Спасибо! Я знал, что ты не откажешь»."],
        [1, "«Друзья не пользуются друг другом»", "«Вот как ты обо мне думаешь. Ясно». Тишина в чате."],
        [3, "«Мы друзья. Поэтому и говорю честно: в долг сейчас не дам»", "«…Ладно. Обидно, но я понимаю»."],
      ] },
    ],
  },
  work: {
    title: "Чужая работа",
    text: "Коллега в который раз просит доделать его часть: «Тебе же несложно».",
    rounds: [
      { say: "«Доделаешь мою часть отчёта? Я совсем зашиваюсь».", options: [
        [0, "«Ладно, давай»", "«Спасибо! Ты всегда выручаешь». Ваши дела ждут вечера."],
        [2, "«Посмотрю…» и тянуть время", "«Так ты возьмёшь или нет? Мне к пяти надо»."],
        [3, "«В этот раз не возьму: у меня свои сроки»", "«Да? Ну… ладно, попробую сам»."],
      ] },
      { say: "«Ну хотя бы графики сделай, там на полчаса».", options: [
        [0, "«Хорошо, только графики»", "Полчаса превращаются в два часа. «И таблицу глянь заодно?»"],
        [1, "«Я тебе не помощник на полставки»", "«Можно было и повежливее…» Он отворачивается к экрану."],
        [3, "«Могу показать, как я их делаю. Это пять минут»", "«О, давай. Так даже лучше»."],
      ] },
      { say: "«Тогда я скажу руководителю, что ты не помогаешь команде».", options: [
        [0, "«Не надо, я сделаю»", "«Вот и договорились». Завтра будет новая просьба."],
        [1, "«Говори кому хочешь»", "«Ну и скажу». В команде становится напряжённо."],
        [3, "«Скажи. Я объясню, что у меня свои задачи, а показать могу в любой момент»", "«…Ладно, не буду. Покажи тогда»."],
      ] },
    ],
  },
  relatives: {
    title: "Непрошеные советы",
    text: "Родственница при всех комментирует вашу личную жизнь.",
    rounds: [
      { say: "«Ну что, когда уже свадьба? Годы-то идут!»", options: [
        [0, "Улыбнуться и промолчать", "«Вот и я говорю! Надо поторопиться». Все смотрят на вас."],
        [1, "«А вас это как касается?»", "«Я же добра желаю! Вот молодёжь пошла…»"],
        [3, "«Знаю, что ты переживаешь. Но эту тему я обсуждать не хочу»", "«Ну ладно-ладно, я просто спросила»."],
      ] },
      { say: "«Я же для тебя стараюсь. Вон у соседки сын уже двоих растит».", options: [
        [0, "«Да, наверное, ты права»", "«Конечно права! Давай я тебя кое с кем познакомлю…»"],
        [2, "Уйти на кухню и не возвращаться", "Из комнаты слышно, как вас обсуждают уже без вас."],
        [3, "«Спасибо, что заботишься. Мне важно, чтобы решения о моей жизни оставались за мной»", "«Хм. Ну, твоя жизнь, конечно»."],
      ] },
      { say: "Через неделю звонок: «Ты что, обижаешься? Я же любя».", options: [
        [0, "«Нет, всё нормально»", "«Вот и хорошо. В субботу приходи, будет одна знакомая с племянником»."],
        [2, "Не брать трубку", "Пять пропущенных и сообщение «Ну и ладно»."],
        [3, "«Я не в обиде. Просто прошу: давай без этой темы. О другом — с радостью»", "«Договорились. Приходи в субботу, просто чаю попьём»."],
      ] },
    ],
  },
  night: {
    title: "Сообщения ночью",
    text: "Близкий человек пишет поздно ночью и обижается, если вы не отвечаете сразу.",
    rounds: [
      { say: "01:20. «Ты спишь? Мне надо поговорить».", options: [
        [0, "Проснуться и проговорить до трёх", "«Спасибо, что ты есть». Утром вы совсем без сил."],
        [2, "Выключить звук и ничего не объяснять", "Утром: «Понятно. Тебе всё равно»."],
        [3, "Утром: «Ночью я сплю. Если срочно, звони. Давай поговорим сейчас?»", "«Ну… ладно. Давай сейчас»."],
      ] },
      { say: "Следующей ночью: «Опять не ответишь?»", options: [
        [0, "«Отвечаю. Что случилось?»", "Разговор до двух. «Только ты меня понимаешь»."],
        [1, "«Ты вообще на часы смотришь?!»", "«Извини, что побеспокоил. Больше не буду». Обида."],
        [3, "«Я рядом, но не ночью. Созвонимся завтра в восемь?»", "«Хорошо… В восемь»."],
      ] },
      { say: "«Раньше от тебя всегда был ответ».", options: [
        [0, "«Ладно, буду отвечать»", "Ночные сообщения становятся привычкой."],
        [1, "«Раньше мне и выспаться не удавалось»", "«Ну и спи дальше»."],
        [3, "«Да. А теперь мне ясно, что нужно спать. Ты для меня важный человек, поэтому говорю как есть»", "«Понял. Спасибо, что говоришь прямо, а не просто пропадаешь»."],
      ] },
    ],
  },
  weekend: {
    title: "Работа в выходной",
    text: "Руководитель пишет в субботу: «Нужно срочно, сделай сегодня».",
    rounds: [
      { say: "Суббота, 11:00. «Нужно срочно, сделай сегодня».", options: [
        [0, "Отменить планы и сесть за работу", "«Отлично, спасибо!» Похоже, суббота станет рабочей и дальше."],
        [2, "Прочитать и не отвечать до понедельника", "«Почему не ответили? Я рассчитывал на вас»."],
        [3, "«Сегодня я не на связи. В понедельник возьмусь первым делом»", "«Хм. Ладно, но с самого утра»."],
      ] },
      { say: "«Клиент ждёт. Ну очень надо».", options: [
        [0, "«Хорошо, сделаю»", "«Вот это подход!» Вечер уходит на работу."],
        [1, "«У меня вообще-то выходной, имейте совесть»", "«Тон можно было бы и сменить». Долгое молчание."],
        [3, "«Если правда горит, могу час в шесть вечера. Остальное в понедельник»", "«Договорились. Час — это уже помощь»."],
      ] },
      { say: "В понедельник: «В следующий раз планируйте быть на связи».", options: [
        [0, "«Хорошо, буду на связи»", "Выходные постепенно становятся рабочими."],
        [2, "Промолчать", "Вопрос остаётся висеть до следующей субботы."],
        [3, "«Давайте договоримся, что считается срочным и как вы меня найдёте в таком случае»", "«Разумно. Обсудим на планёрке»."],
      ] },
    ],
  },
};

const scenariosKk: Scenarios = {
  debt: {
    title: "Қарыз",
    text: "Досыңыз алдыңғы қарызын қайтармай тұрып, тағы қарыз сұрайды.",
    rounds: [
      { say: "«Айлыққа дейін көмектесші? Жиырма мың керек болып тұр».", options: [
        [0, "«Жарайды, аударамын»", "«Сен ең жақсысысың! Міндетті түрде қайтарамын». Алдыңғы қарыз әлі тұр."],
        [1, "«Алдыңғысын қайтаратын ойың бар ма өзі?»", "«Кекшіл екенсің ғой… Мен әдейі істеген жоқпын»."],
        [3, "«Қазір бере алмаймын. Алдымен алдыңғы қарызды жабайық»", "«Ой… Ұмытып кетіппін. Ыңғайсыз болды»."],
      ] },
      { say: "«Өтінемін, басқа сұрайтын ешкімім жоқ».", options: [
        [0, "«Жарайды, бірақ соңғы рет»", "«Әрине, әрине!» Таныс естіледі."],
        [2, "Хабарламаларға жауап бермеу", "Бір сағаттан кейін: «Мұндасың ба?» Сұрақ қалған жоқ."],
        [3, "«Қиын екенін түсінемін. Ақшамен көмектесе алмаймын, бірақ қайдан табуға болатынын бірге ойлайық»", "«Жарайды… Бірге ойлайық»."],
      ] },
      { say: "«Біз доспыз деп ойлап едім».", options: [
        [0, "«Әрине доспыз. Мә»", "«Рақмет! Бас тартпайтыныңды білгенмін»."],
        [1, "«Достар бірін-бірі пайдаланбайды»", "«Мен туралы осылай ойлайды екенсің ғой». Чатта үнсіздік."],
        [3, "«Доспыз. Сондықтан шынымды айтамын: қазір қарызға бермеймін»", "«…Жарайды. Өкінішті, бірақ түсінемін»."],
      ] },
    ],
  },
  work: {
    title: "Басқаның жұмысы",
    text: "Әріптесіңіз тағы да өз бөлігін бітіріп беруді сұрайды: «Саған қиын емес қой».",
    rounds: [
      { say: "«Есептің менің бөлігімді бітіріп бересің бе? Мүлде үлгермей жатырмын».", options: [
        [0, "«Жарайды, бер»", "«Рақмет! Сен әрқашан көмектесесің». Өз істеріңіз кешке қалады."],
        [2, "«Қараймын…» деп уақыт созу", "«Сонымен аласың ба, жоқ па? Маған беске дейін керек»."],
        [3, "«Бұл жолы алмаймын: менің өз мерзімім бар»", "«Солай ма? Жарайды, өзім көрейін»."],
      ] },
      { say: "«Ең болмаса графиктерді жасап берші, жарты сағаттық жұмыс».", options: [
        [0, "«Жарайды, тек графиктер»", "Жарты сағат екі сағатқа айналады. «Кестеге де қарай салшы?»"],
        [1, "«Мен саған жарты ставкалық көмекші емеспін»", "«Сыпайырақ айтуға болар еді…» Ол экранға бұрылады."],
        [3, "«Өзім қалай жасайтынымды көрсете аламын. Бес минут»", "«О, көрсетші. Бұл тіпті жақсы»."],
      ] },
      { say: "«Онда басшыға командаға көмектеспейді деп айтамын».", options: [
        [0, "«Керек емес, жасаймын»", "«Міне, келістік». Ертең жаңа өтініш болады."],
        [1, "«Кімге айтсаң да айт»", "«Айтамын да». Командада шиеленіс пайда болады."],
        [3, "«Айт. Менің өз тапсырмаларым бар екенін түсіндіремін, ал көрсетуге кез келген уақытта дайынмын»", "«…Жарайды, айтпаймын. Онда көрсетші»."],
      ] },
    ],
  },
  relatives: {
    title: "Сұралмаған кеңестер",
    text: "Туысыңыз жұрттың алдында жеке өміріңізге пікір айтады.",
    rounds: [
      { say: "«Ал, той қашан? Жас өтіп барады ғой!»", options: [
        [0, "Күліп, үндемеу", "«Мен де соны айтамын! Асығу керек». Бәрі сізге қарап отыр."],
        [1, "«Ал сізге оның қандай қатысы бар?»", "«Мен жақсылық тілеп отырмын ғой! Қазіргі жастар…»"],
        [3, "«Уайымдайтыныңызды білемін. Бірақ бұл тақырыпты талқылауға дайын емеспін»", "«Жарайды, жарайды, жай сұрадым ғой»."],
      ] },
      { say: "«Мен сен үшін тырысып жүрмін ғой. Көршінің баласы екі бала өсіріп отыр».", options: [
        [0, "«Иә, бәлкім, сіз дұрыссыз»", "«Әрине дұрыспын! Сені біреумен таныстырайын…»"],
        [2, "Ас үйге кетіп, қайтып оралмау", "Бөлмеден сізді сізсіз талқылап жатқандары естіледі."],
        [3, "«Қамқорлығыңызға рақмет. Өз өмірім туралы өзім шешкенім маған маңызды»", "«Хм. Әрине, өз өмірің ғой»."],
      ] },
      { say: "Бір аптадан кейін қоңырау: «Ренжідің бе? Мен жақсы көргеннен айттым ғой».", options: [
        [0, "«Жоқ, бәрі жақсы»", "«Жақсы болды. Сенбіде кел, бір танысым жиенімен келеді»."],
        [2, "Телефонды алмау", "Бес қабылданбаған қоңырау және «Жарайды онда» деген хабарлама."],
        [3, "«Ренжіген жоқпын. Тек өтінемін: бұл тақырыпсыз болайық. Басқа туралы қуана сөйлесемін»", "«Келістік. Сенбіде кел, жай шай ішейік»."],
      ] },
    ],
  },
  night: {
    title: "Түнгі хабарламалар",
    text: "Жақын адамыңыз түн ортасында жазып, бірден жауап бермесеңіз ренжиді.",
    rounds: [
      { say: "01:20. «Ұйықтап жатырсың ба? Сөйлесу керек».", options: [
        [0, "Оянып, түнгі үшке дейін сөйлесу", "«Сен барсың, рақмет». Таңертең мүлде әлсізсіз."],
        [2, "Дыбысты өшіріп, ештеңе түсіндірмеу", "Таңертең: «Түсінікті. Саған бәрібір»."],
        [3, "Таңертең: «Түнде ұйықтаймын. Шұғыл болса, қоңырау шал. Қазір сөйлесейік пе?»", "«Жарайды… Қазір сөйлесейік»."],
      ] },
      { say: "Келесі түні: «Тағы жауап бермейсің бе?»", options: [
        [0, "«Жауап беріп тұрмын. Не болды?»", "Түнгі екіге дейін әңгіме. «Мені түсінетін жалғыз сенсің»."],
        [1, "«Сағатқа қарайсың ба өзі?!»", "«Мазаладым, кешір. Енді жазбаймын». Өкпе."],
        [3, "«Мен қасыңдамын, бірақ түнде емес. Ертең сегізде сөйлесейік пе?»", "«Жарайды… Сегізде»."],
      ] },
      { say: "«Бұрын әрқашан жауап беретінсің».", options: [
        [0, "«Жарайды, жауап беремін»", "Түнгі хабарламалар әдетке айналады."],
        [1, "«Бұрын ұйқым да қанбайтын»", "«Ұйықтай бер онда»."],
        [3, "«Иә. Енді ұйықтауым керек екенін түсіндім. Сен маған қымбатсың, сондықтан шынымды айтамын»", "«Түсіндім. Жай жоғалып кетпей, айтқаның үшін рақмет»."],
      ] },
    ],
  },
  weekend: {
    title: "Демалыстағы жұмыс",
    text: "Басшыңыз сенбіде жазады: «Шұғыл керек, бүгін жасаңыз».",
    rounds: [
      { say: "Сенбі, 11:00. «Шұғыл керек, бүгін жасаңыз».", options: [
        [0, "Жоспарларды тоқтатып, жұмысқа отыру", "«Тамаша, рақмет!» Сенбі бұдан әрі де жұмыс күні болатын сияқты."],
        [2, "Оқып, дүйсенбіге дейін жауап бермеу", "«Неге жауап бермедіңіз? Мен сізге сеніп едім»."],
        [3, "«Бүгін байланыста емеспін. Дүйсенбіде бірінші кезекте қолға аламын»", "«Хм. Жарайды, бірақ таңертең»."],
      ] },
      { say: "«Клиент күтіп отыр. Өте қажет».", options: [
        [0, "«Жарайды, жасаймын»", "«Міне, осылай!» Кеш жұмыспен өтеді."],
        [1, "«Менің демалысым ғой, ұят болсын»", "«Сөйлеу мәнерін өзгертуге болар еді». Ұзақ үнсіздік."],
        [3, "«Шынымен шұғыл болса, кешкі алтыда бір сағат бере аламын. Қалғаны дүйсенбіде»", "«Келістік. Бір сағаттың өзі көмек»."],
      ] },
      { say: "Дүйсенбіде: «Келесі жолы байланыста болуды жоспарлаңыз».", options: [
        [0, "«Жарайды, байланыста боламын»", "Демалыс күндері бірте-бірте жұмыс күніне айналады."],
        [2, "Үндемеу", "Сұрақ келесі сенбіге дейін ашық қалады."],
        [3, "«Не шұғыл саналатынын және мұндайда мені қалай табатыныңызды келісіп алайық»", "«Орынды. Жиналыста талқылайық»."],
      ] },
    ],
  },
};

const scenariosEn: Scenarios = {
  debt: {
    title: "The loan",
    text: "A friend asks to borrow money again, though the last loan hasn't been paid back.",
    rounds: [
      { say: "“Could you help me out until payday? I really need it.”", options: [
        [0, "“Fine, I'll send it”", "“You're the best! I'll pay you back, promise.” The old loan is still there."],
        [1, "“Are you ever going to pay back the last one?”", "“Wow, you really hold a grudge… It's not like I meant to.”"],
        [3, "“I can't right now. Let's settle the last loan first”", "“Oh… I forgot about that. Awkward.”"],
      ] },
      { say: "“Please, I honestly have no one else to ask.”", options: [
        [0, "“Okay, but this is the last time”", "“Of course, of course!” Sounds familiar."],
        [2, "Stop answering messages", "An hour later: “Are you there?” The question hasn't gone anywhere."],
        [3, "“I see it's hard for you. I can't help with money, but I can help you think where to find it”", "“Okay… Let's think together.”"],
      ] },
      { say: "“I thought we were friends.”", options: [
        [0, "“We are, of course. Here you go”", "“Thanks! I knew you wouldn't say no.”"],
        [1, "“Friends don't use each other”", "“So that's what you think of me. Got it.” Silence in the chat."],
        [3, "“We are friends. That's why I'm being honest: I won't lend money right now”", "“…Okay. It stings, but I get it.”"],
      ] },
    ],
  },
  work: {
    title: "Someone else's work",
    text: "A colleague asks you, yet again, to finish their part: “It's easy for you.”",
    rounds: [
      { say: "“Can you finish my part of the report? I'm swamped.”", options: [
        [0, "“Fine, give it here”", "“Thanks! You always help.” Your own work waits until evening."],
        [2, "Say “I'll see…” and stall", "“So will you take it or not? I need it by five.”"],
        [3, "“Not this time: I have my own deadlines”", "“Oh? Well… okay, I'll try myself.”"],
      ] },
      { say: "“At least do the charts, it's half an hour.”", options: [
        [0, "“Okay, just the charts”", "Half an hour turns into two. “Could you check the table too?”"],
        [1, "“I'm not your part-time assistant”", "“You could be nicer about it…” They turn back to the screen."],
        [3, "“I can show you how I make them. Five minutes”", "“Oh, sure. That's even better.”"],
      ] },
      { say: "“Then I'll tell the manager you don't help the team.”", options: [
        [0, "“Don't, I'll do it”", "“Deal.” Tomorrow there will be a new request."],
        [1, "“Tell whoever you want”", "“I will.” The team grows tense."],
        [3, "“Go ahead. I'll explain I have my own tasks, and I'm happy to show you any time”", "“…Fine, I won't. Show me then.”"],
      ] },
    ],
  },
  relatives: {
    title: "Unasked-for advice",
    text: "A relative comments on your personal life in front of everyone.",
    rounds: [
      { say: "“So, when's the wedding? You're not getting any younger!”", options: [
        [0, "Smile and say nothing", "“That's what I keep saying! Better hurry.” Everyone looks at you."],
        [1, "“How is that any of your business?”", "“I only want the best for you! Young people these days…”"],
        [3, "“I know you worry. But I'm not ready to discuss this”", "“Alright, alright, I was just asking.”"],
      ] },
      { say: "“I'm trying for your sake. The neighbour's son already has two kids.”", options: [
        [0, "“Yes, maybe you're right”", "“Of course I'm right! Let me introduce you to someone…”"],
        [2, "Go to the kitchen and stay there", "From the next room you hear them discussing you without you."],
        [3, "“Thank you for caring. It matters to me that I decide about my own life”", "“Hm. Well, it is your life.”"],
      ] },
      { say: "A week later, a call: “Did I upset you? I meant well.”", options: [
        [0, "“No, it's fine”", "“Good. Come on Saturday, a friend is bringing her nephew.”"],
        [2, "Don't pick up", "Five missed calls and a message: “Fine then.”"],
        [3, "“I'm not upset. I just ask: let's leave that topic. Anything else, gladly”", "“Deal. Come on Saturday, we'll just have tea.”"],
      ] },
    ],
  },
  night: {
    title: "Late-night messages",
    text: "Someone close texts late at night and gets hurt if you don't reply at once.",
    rounds: [
      { say: "1:20 a.m. “Are you asleep? I need to talk.”", options: [
        [0, "Wake up and talk until three", "“Thank you for being there.” In the morning you're exhausted."],
        [2, "Mute the phone and explain nothing", "In the morning: “I see. You don't care.”"],
        [3, "In the morning: “I sleep at night. If it's urgent, call. Shall we talk now?”", "“Well… okay. Let's talk now.”"],
      ] },
      { say: "The next night: “Not answering again?”", options: [
        [0, "“I'm here. What happened?”", "Talking until two. “You're the only one who gets me.”"],
        [1, "“Do you even look at the clock?!”", "“Sorry I bothered you. I won't again.” Hurt."],
        [3, "“I'm here for you, just not at night. Call tomorrow at eight?”", "“Okay… At eight.”"],
      ] },
      { say: "“You always used to answer.”", options: [
        [0, "“Fine, I'll answer”", "Night messages become a habit."],
        [1, "“I also never used to sleep”", "“Then go back to sleep.”"],
        [3, "“Yes. And I've realised I need sleep. You matter to me, so I'm telling you straight”", "“Got it. Thanks for saying it instead of just disappearing.”"],
      ] },
    ],
  },
  weekend: {
    title: "Work on the weekend",
    text: "Your manager writes on Saturday: “It's urgent, do it today.”",
    rounds: [
      { say: "Saturday, 11 a.m. “It's urgent, do it today.”", options: [
        [0, "Cancel your plans and get to work", "“Great, thanks!” Saturdays may keep being workdays."],
        [2, "Read it and don't reply until Monday", "“Why didn't you answer? I was counting on you.”"],
        [3, "“I'm offline today. I'll take it first thing on Monday”", "“Hm. Okay, but first thing.”"],
      ] },
      { say: "“The client is waiting. We really need it.”", options: [
        [0, "“Okay, I'll do it”", "“That's the spirit!” The evening goes to work."],
        [1, "“It's my day off, have some decency”", "“You could watch your tone.” A long silence."],
        [3, "“If it's really burning, I can give an hour at six. The rest on Monday”", "“Deal. An hour is already a help.”"],
      ] },
      { say: "On Monday: “Next time, plan to be reachable.”", options: [
        [0, "“Okay, I'll be reachable”", "Weekends slowly turn into workdays."],
        [2, "Say nothing", "The question hangs until next Saturday."],
        [3, "“Let's agree on what counts as urgent and how you'll reach me then”", "“Fair. Let's discuss it at the meeting.”"],
      ] },
    ],
  },
};

const endingsRu: Endings = {
  clear: { title: "Граница видна", text: "Вы несколько раз спокойно сказали, что вам подходит, а что нет. Было неловко, но разговор не развалился. Теперь другому понятнее, чего от вас ждать." },
  yield: { title: "Граница сдвинулась", text: "Конфликта не было, и человеку стало легче. Но ваших сил стало меньше, а просьбы, скорее всего, повторятся." },
  wall: { title: "Стена с шипами", text: "Вас точно услышали, но разговор ушёл в тон и обиды. Границу видно, только рядом с ней трудно остаться." },
  fog: { title: "Граница в тумане", text: "Вы сберегли силы и не стали спорить. Но другой так и не узнал, что вам не подходит, и ситуация может вернуться." },
  mixed: { title: "Путь с поворотами", text: "Вы пробовали разное: где-то уступили, где-то обозначили своё. В жизни так и бывает. Посмотрите, после какого ответа стало легче." },
};
const endingsKk: Endings = {
  clear: { title: "Шекара көрінеді", text: "Сізге не келетінін, не келмейтінін бірнеше рет сабырмен айттыңыз. Ыңғайсыз болды, бірақ әңгіме бұзылған жоқ. Енді сізден не күтуге болатыны түсініктірек." },
  yield: { title: "Шекара ығысты", text: "Жанжал болмады, адамға жеңіл болды. Бірақ сіздің күшіңіз азайды, ал өтініштер қайталанатын сияқты." },
  wall: { title: "Тікенді қабырға", text: "Сізді анық естіді, бірақ әңгіме реніш пен үнге ауысып кетті. Шекара көрінеді, бірақ оның қасында қалу қиын." },
  fog: { title: "Тұмандағы шекара", text: "Күшіңізді сақтап, дауласпадыңыз. Бірақ басқа адам сізге не келмейтінін білмей қалды, жағдай қайталануы мүмкін." },
  mixed: { title: "Бұрылыстары бар жол", text: "Әр түрлі байқап көрдіңіз: бір жерде көндіңіз, бір жерде өзіңізді білдірдіңіз. Өмірде солай болады. Қай жауаптан кейін жеңіл болғанына назар аударыңыз." },
};
const endingsEn: Endings = {
  clear: { title: "The boundary is visible", text: "Several times you calmly said what works for you and what doesn't. It was awkward, but the conversation held. Now the other person knows better what to expect from you." },
  yield: { title: "The boundary moved", text: "There was no conflict and they felt relieved. But you have less energy now, and the requests will likely come back." },
  wall: { title: "A spiked wall", text: "You were definitely heard, but the talk turned into tone and hurt. The boundary is visible, it's just hard to stay close to it." },
  fog: { title: "A boundary in the fog", text: "You saved your energy and didn't argue. But the other person never learned what doesn't work for you, so it may happen again." },
  mixed: { title: "A winding path", text: "You tried different things: gave in here, held your ground there. That's how life goes. Notice which answer made it easier." },
};

export const boundariesMessages = defineMessages({
  ru: {
    aria: "Ночная сцена: вы, ваша граница и другой человек",
    you: "вы",
    other: "другой",
    pickTitle: "Выберите ситуацию",
    pickHint: "Три хода в каждой. Разные ответы ведут к разным концовкам, и всё можно переиграть.",
    seen: (n: number, total: number) => `Концовок открыто: ${n} из ${total}`,
    ownTitle: "Своя ситуация",
    ownHint: "Опишите, и Опи поможет разобрать её в разговоре.",
    ownPlaceholder: "Коротко: кто и что делает",
    ownGo: "Разобрать с Опи",
    ownPrompt: (text: string) => `Хочу потренировать свою границу. Ситуация: ${text}. Помоги мне найти, что я могу сказать, и отрепетировать это.`,
    meterSelf: "Ваши силы",
    meterLink: "Связь",
    round: (n: number) => `Ход ${n} из 3`,
    choose: "Что вы сделаете?",
    next: "Дальше",
    toEnding: "Чем закончилось",
    styles: ["Уступить", "Резко", "Уйти от разговора", "Спокойно и ясно"],
    scenarios: scenariosRu,
    endings: endingsRu,
    newEnding: "Новая концовка",
    kindNote: "Здесь нет правильного пути. Уступить бывает разумно, а резкость понятна, когда терпели слишком долго.",
    pathTitle: "Ваш путь",
    lastTime: "в прошлый раз",
    again: "Переиграть по-другому",
    otherScene: "Другая ситуация",
    phraseTitle: "Своя фраза (если хочется)",
    phraseHint: "Как бы вы сказали это в жизни? Можно взять фразу из игры и переделать под себя.",
    phrasePlaceholder: "Например: «Сейчас не смогу, давай вернёмся к этому завтра»",
    makeStep: "Сделать это моим шагом",
    stepSaved: "Шаг сохранён. Он ждёт вас на главной.",
    stepText: (phrase: string) => `Сказать: «${phrase}»`,
    journal: (scene: string, ending: string, path: string) => `Мои границы. Ситуация: ${scene} Концовка: ${ending}. Путь: ${path}.`,
    prompt: (scene: string, ending: string, phrase: string) =>
      `Я прошёл(а) «Мои границы». Ситуация: ${scene} У меня получилась концовка «${ending}».${phrase ? ` Моя фраза: «${phrase}».` : ""} Помоги подготовиться сказать это в жизни.`,
  },
  kk: {
    aria: "Түнгі көрініс: сіз, сіздің шекараңыз және басқа адам",
    you: "сіз",
    other: "басқа",
    pickTitle: "Жағдайды таңдаңыз",
    pickHint: "Әрқайсысында үш жүріс. Әр түрлі жауап әр түрлі соңға апарады, бәрін қайта ойнауға болады.",
    seen: (n: number, total: number) => `Ашылған соңы: ${n} / ${total}`,
    ownTitle: "Өз жағдайыңыз",
    ownHint: "Сипаттап беріңіз, Опи оны әңгімеде талдауға көмектеседі.",
    ownPlaceholder: "Қысқаша: кім не істейді",
    ownGo: "Опимен талдау",
    ownPrompt: (text: string) => `Өз шекарамды жаттықтырғым келеді. Жағдай: ${text}. Не айта алатынымды табуға және соны жаттықтыруға көмектесші.`,
    meterSelf: "Сіздің күшіңіз",
    meterLink: "Байланыс",
    round: (n: number) => `${n}-жүріс / 3`,
    choose: "Не істейсіз?",
    next: "Әрі қарай",
    toEnding: "Немен аяқталды",
    styles: ["Көну", "Қатаң", "Әңгімеден қашу", "Сабырмен, анық"],
    scenarios: scenariosKk,
    endings: endingsKk,
    newEnding: "Жаңа соңы",
    kindNote: "Мұнда дұрыс жол жоқ. Кейде көну орынды, ал ұзақ шыдағанда қатаңдық түсінікті.",
    pathTitle: "Сіздің жолыңыз",
    lastTime: "өткен жолы",
    again: "Басқаша ойнау",
    otherScene: "Басқа жағдай",
    phraseTitle: "Өз сөзіңіз (қаласаңыз)",
    phraseHint: "Өмірде мұны қалай айтар едіңіз? Ойыннан сөз алып, өзіңізге бейімдеуге болады.",
    phrasePlaceholder: "Мысалы: «Қазір алмаймын, ертең оралайық»",
    makeStep: "Мұны қадамым қылу",
    stepSaved: "Қадам сақталды. Ол басты бетте күтіп тұр.",
    stepText: (phrase: string) => `Айту: «${phrase}»`,
    journal: (scene: string, ending: string, path: string) => `Менің шекараларым. Жағдай: ${scene} Соңы: ${ending}. Жол: ${path}.`,
    prompt: (scene: string, ending: string, phrase: string) =>
      `Мен «Менің шекараларым» ойынын өттім. Жағдай: ${scene} Соңы: «${ending}».${phrase ? ` Менің сөзім: «${phrase}».` : ""} Мұны өмірде айтуға дайындалуға көмектесші.`,
  },
  en: {
    aria: "Night scene: you, your boundary and another person",
    you: "you",
    other: "them",
    pickTitle: "Choose a situation",
    pickHint: "Three moves in each. Different answers lead to different endings, and you can replay any of them.",
    seen: (n: number, total: number) => `Endings found: ${n} of ${total}`,
    ownTitle: "Your own situation",
    ownHint: "Describe it and Opi will help you work through it in a conversation.",
    ownPlaceholder: "Briefly: who does what",
    ownGo: "Work through it with Opi",
    ownPrompt: (text: string) => `I want to practise a boundary. The situation: ${text}. Help me find what I could say and rehearse it.`,
    meterSelf: "Your energy",
    meterLink: "Connection",
    round: (n: number) => `Move ${n} of 3`,
    choose: "What will you do?",
    next: "Next",
    toEnding: "How it ended",
    styles: ["Give in", "Snap back", "Avoid it", "Calm and clear"],
    scenarios: scenariosEn,
    endings: endingsEn,
    newEnding: "New ending",
    kindNote: "There's no right path here. Giving in can be wise, and snapping makes sense after holding on too long.",
    pathTitle: "Your path",
    lastTime: "last time",
    again: "Replay differently",
    otherScene: "Another situation",
    phraseTitle: "Your own words (if you like)",
    phraseHint: "How would you say it in real life? You can take a line from the game and make it yours.",
    phrasePlaceholder: "For example: “I can't right now, let's come back to it tomorrow”",
    makeStep: "Make this my step",
    stepSaved: "Step saved. It's waiting for you on the home screen.",
    stepText: (phrase: string) => `Say: “${phrase}”`,
    journal: (scene: string, ending: string, path: string) => `My boundaries. Situation: ${scene} Ending: ${ending}. Path: ${path}.`,
    prompt: (scene: string, ending: string, phrase: string) =>
      `I played “My boundaries”. Situation: ${scene} My ending was “${ending}”.${phrase ? ` My words: “${phrase}”.` : ""} Help me get ready to say this in real life.`,
  },
});
