import { defineMessages } from "./config";

// Переписка с психологом и уведомления о встречах и работе со специалистом.
type Who = { name: string; when: string };

export const careChatMessages = defineMessages<{
  title: string;
  write: string;
  placeholder: string;
  send: string;
  empty: string;
  emptyPro: string;
  read: string;
  sent: string;
  sending: string;
  failed: string;
  tooMany: string;
  closed: string;
  safety: string;
  privacy: string;
  today: string;
  yesterday: string;
  messages: string;
  noConversations: string;
  noNew: string;
  all: string;
  you: string;
  unread: (n: number) => string;
  newMessage: (name: string) => string;
  remindTitle: (name: string) => string;
  remindText: (when: string) => string;
  notificationsTitle: string;
  noNotifications: string;
  someone: string;
  email: { subject: (when: string) => string; hello: (name: string) => string; text: (peer: string, when: string) => string; open: string; why: string };
  events: {
    client: Record<string, (w: Who) => string>;
    pro: Record<string, (w: Who) => string>;
  };
}>({
  ru: {
    title: "Переписка",
    write: "Написать",
    placeholder: "Сообщение…",
    send: "Отправить",
    empty: "Здесь можно написать специалисту между встречами: вопрос, наблюдение или просьбу перенести встречу.",
    emptyPro: "Сообщений пока нет. Клиент увидит ваше сообщение у себя в «Опоре».",
    read: "Прочитано",
    sent: "Отправлено",
    sending: "Отправляем…",
    failed: "Не отправилось. Попробуйте ещё раз.",
    tooMany: "Слишком много сообщений подряд. Подождите минуту.",
    closed: "Работа завершена, новые сообщения отправить нельзя. История остаётся у вас.",
    safety: "Это не экстренная связь: специалист отвечает, когда может. Если вам сейчас опасно, звоните 112.",
    privacy: "Переписку видите только вы и ваш специалист. ИИ её не читает.",
    today: "Сегодня",
    yesterday: "Вчера",
    messages: "Сообщения",
    noConversations: "Здесь появятся переписки с клиентами.",
    noNew: "Новых сообщений нет.",
    all: "Все",
    you: "Вы",
    unread: (n) => `${n} новых`,
    newMessage: (name) => `Новое сообщение: ${name}`,
    remindTitle: (name) => `Скоро встреча: ${name}`,
    remindText: (when) => when,
    notificationsTitle: "Уведомления",
    noNotifications: "Новых событий нет.",
    someone: "Специалист",
    email: {
      subject: (when) => `Напоминание о встрече: ${when}`,
      hello: (name) => (name ? `Здравствуйте, ${name}!` : "Здравствуйте!"),
      text: (peer, when) => `Напоминаем о встрече в «Опоре»: ${when}. ${peer}.`,
      open: "Открыть в «Опоре»",
      why: "Вы получили это письмо, потому что у вас запланирована встреча в «Опоре».",
    },
    events: {
      client: {
        "link.created": ({ name }) => `${name}: теперь вы работаете вместе`,
        "link.ended": ({ name }) => `${name}: работа завершена`,
        "session.booked": ({ name, when }) => `${name}: назначена встреча на ${when}`,
        "session.rescheduled": ({ name, when }) => `${name}: встреча перенесена на ${when}`,
        "session.cancelled": ({ name, when }) => `${name}: встреча ${when} отменена`,
        "session.completed": ({ name }) => `${name}: итоги встречи готовы`,
      },
      pro: {
        "link.requested": ({ name, when }) => `${name}: новая заявка${when ? `, ${when}` : ""}`,
        "link.created": ({ name }) => `${name}: новый клиент`,
        "link.ended": ({ name }) => `${name}: работа завершена`,
        "session.booked": ({ name, when }) => `${name}: новая запись на ${when}`,
        "session.rescheduled": ({ name, when }) => `${name}: встреча перенесена на ${when}`,
        "session.cancelled": ({ name, when }) => `${name}: встреча ${when} отменена`,
        "psychologist.reviewed": () => "Решение по вашей анкете",
      },
    },
  },
  kk: {
    title: "Хат алмасу",
    write: "Жазу",
    placeholder: "Хабарлама…",
    send: "Жіберу",
    empty: "Мұнда кездесулер арасында маманға жазуға болады: сұрақ, байқау немесе кездесуді ауыстыру өтініші.",
    emptyPro: "Әзірге хабарлама жоқ. Клиент сіздің хабарламаңызды «Опорада» көреді.",
    read: "Оқылды",
    sent: "Жіберілді",
    sending: "Жіберіп жатырмыз…",
    failed: "Жіберілмеді. Қайта көріңіз.",
    tooMany: "Хабарлама тым көп. Бір минут күтіңіз.",
    closed: "Жұмыс аяқталды, жаңа хабарлама жіберу мүмкін емес. Тарих сізде қалады.",
    safety: "Бұл шұғыл байланыс емес: маман мүмкіндігінше жауап береді. Қазір қауіп төнсе, 112-ге қоңырау шалыңыз.",
    privacy: "Хат алмасуды тек сіз бен маманыңыз көресіз. ЖИ оны оқымайды.",
    today: "Бүгін",
    yesterday: "Кеше",
    messages: "Хабарламалар",
    noConversations: "Мұнда клиенттермен хат алмасу шығады.",
    noNew: "Жаңа хабарлама жоқ.",
    all: "Барлығы",
    you: "Сіз",
    unread: (n) => `${n} жаңа`,
    newMessage: (name) => `Жаңа хабарлама: ${name}`,
    remindTitle: (name) => `Жақында кездесу: ${name}`,
    remindText: (when) => when,
    notificationsTitle: "Хабарламалар",
    noNotifications: "Жаңа оқиға жоқ.",
    someone: "Маман",
    email: {
      subject: (when) => `Кездесу туралы еске салу: ${when}`,
      hello: (name) => (name ? `Сәлеметсіз бе, ${name}!` : "Сәлеметсіз бе!"),
      text: (peer, when) => `«Опорадағы» кездесуді еске саламыз: ${when}. ${peer}.`,
      open: "«Опорада» ашу",
      why: "Бұл хатты «Опорада» кездесуіңіз жоспарланғандықтан алдыңыз.",
    },
    events: {
      client: {
        "link.created": ({ name }) => `${name} сізді клиент ретінде қабылдады`,
        "link.ended": ({ name }) => `${name} сізбен жұмысты аяқтады`,
        "session.booked": ({ name, when }) => `${name} кездесу белгіледі: ${when}`,
        "session.rescheduled": ({ name, when }) => `${name} кездесуді ауыстырды: ${when}`,
        "session.cancelled": ({ name, when }) => `${name} кездесуді болдырмады: ${when}`,
        "session.completed": ({ name }) => `${name} кездесу қорытындысын қалдырды`,
      },
      pro: {
        "link.requested": ({ name, when }) => `Жаңа өтінім: ${name}${when ? `, ${when}` : ""}`,
        "link.created": ({ name }) => `Жаңа клиент: ${name}`,
        "link.ended": ({ name }) => `${name} жұмысты аяқтады`,
        "session.booked": ({ name, when }) => `${name} жазылды: ${when}`,
        "session.rescheduled": ({ name, when }) => `${name} кездесуді ауыстырды: ${when}`,
        "session.cancelled": ({ name, when }) => `${name} кездесуді болдырмады: ${when}`,
        "psychologist.reviewed": () => "Сауалнамаңыз бойынша шешім",
      },
    },
  },
  en: {
    title: "Messages",
    write: "Message",
    placeholder: "Message…",
    send: "Send",
    empty: "Write to your specialist between sessions: a question, an observation or a request to move a session.",
    emptyPro: "No messages yet. Your client will see your message in Opora.",
    read: "Read",
    sent: "Sent",
    sending: "Sending…",
    failed: "Not sent. Please try again.",
    tooMany: "Too many messages in a row. Please wait a minute.",
    closed: "Work has ended, new messages can't be sent. The history stays with you.",
    safety: "This is not an emergency line: your specialist replies when they can. If you are in danger now, call 112.",
    privacy: "Only you and your specialist see these messages. AI does not read them.",
    today: "Today",
    yesterday: "Yesterday",
    messages: "Messages",
    noConversations: "Conversations with clients will appear here.",
    noNew: "No new messages.",
    all: "All",
    you: "You",
    unread: (n) => `${n} new`,
    newMessage: (name) => `New message: ${name}`,
    remindTitle: (name) => `Session soon: ${name}`,
    remindText: (when) => when,
    notificationsTitle: "Notifications",
    noNotifications: "Nothing new.",
    someone: "Specialist",
    email: {
      subject: (when) => `Session reminder: ${when}`,
      hello: (name) => (name ? `Hello, ${name}!` : "Hello!"),
      text: (peer, when) => `A reminder about your session in Opora: ${when}. ${peer}.`,
      open: "Open in Opora",
      why: "You received this email because you have a session scheduled in Opora.",
    },
    events: {
      client: {
        "link.created": ({ name }) => `${name} accepted you as a client`,
        "link.ended": ({ name }) => `${name} ended your work together`,
        "session.booked": ({ name, when }) => `${name} scheduled a session: ${when}`,
        "session.rescheduled": ({ name, when }) => `${name} moved your session to ${when}`,
        "session.cancelled": ({ name, when }) => `${name} cancelled the session on ${when}`,
        "session.completed": ({ name }) => `${name} left session notes`,
      },
      pro: {
        "link.requested": ({ name, when }) => `New request: ${name}${when ? `, ${when}` : ""}`,
        "link.created": ({ name }) => `New client: ${name}`,
        "link.ended": ({ name }) => `${name} ended your work together`,
        "session.booked": ({ name, when }) => `${name} booked a session: ${when}`,
        "session.rescheduled": ({ name, when }) => `${name} moved a session to ${when}`,
        "session.cancelled": ({ name, when }) => `${name} cancelled the session on ${when}`,
        "psychologist.reviewed": () => "Decision on your profile",
      },
    },
  },
});
