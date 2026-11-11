import { defineMessages } from "./config";

// Пробный доступ без регистрации: 20 минут гостем со всеми возможностями, кроме комнат.
type Linked = [string, string, string];

export const trialMessages = defineMessages({
  ru: {
    metaTitle: "Пробный доступ",
    // Подпись под кнопкой «Попробовать»: нажатие означает согласие.
    startNote: ["Нажимая «Попробовать», вы принимаете ", "условия и политику конфиденциальности", " и подтверждаете, что вам есть 18 лет."] as Linked,
    startHint: (min: number) => `${min} минут гостем: всё, кроме комнат. Почта не нужна.`,
    badge: { guest: "Гость", left: "осталось", keep: "Сохранить" },
    active: {
      title: "Вы в гостях",
      text: (min: number) => `Пробный доступ длится ${min} минут. Создайте аккаунт, и всё, что вы успели сделать, останется с вами.`,
      left: "Осталось",
      back: "Вернуться в Опору",
    },
    over: {
      title: "Пробное время закончилось",
      text: "Спасибо, что заглянули. Создайте аккаунт, чтобы продолжить: ваши разговоры и записи сохранятся.",
    },
    rooms: {
      title: "Комнаты открыты после регистрации",
      text: "В комнатах общаются живые люди, поэтому туда входят с аккаунтом. Создайте его, и всё, что вы успели сделать, останется с вами.",
    },
    used: {
      title: "Пробный доступ уже был",
      text: "На этом устройстве пробное время уже использовано. Создайте аккаунт, это бесплатно.",
      signup: "Создать аккаунт",
      login: "Войти",
    },
    unavailable: "Пробный доступ сейчас недоступен. Создайте аккаунт, это бесплатно.",
    busy: "Слишком много попыток. Попробуйте чуть позже или создайте аккаунт.",
    form: {
      submit: "Создать аккаунт и сохранить",
      submitting: "Сохраняем…",
      sentTitle: "Проверьте почту",
      sent: (email: string) => `Мы отправили письмо на ${email}. Откройте ссылку из него, и аккаунт будет готов.`,
      sentHint: "Письмо может прийти через пару минут. Загляните и в папку «Спам».",
      taken: "Такая почта уже зарегистрирована. Войдите в свой аккаунт.",
    },
    leave: "Выйти без сохранения",
    haveAccount: "Уже есть аккаунт?",
    needAccount: "Для этого нужен аккаунт. Создайте его, и всё сохранится.",
  },
  kk: {
    metaTitle: "Сынақ кіру",
    startNote: ["«Көру» түймесін басу арқылы сіз ", "шарттар мен құпиялылық саясатын", " қабылдайсыз және 18 жасқа толғаныңызды растайсыз."],
    startHint: (min) => `${min} минут қонақ ретінде: бөлмелерден басқасының бәрі. Пошта қажет емес.`,
    badge: { guest: "Қонақ", left: "қалды", keep: "Сақтау" },
    active: {
      title: "Сіз қонақтасыз",
      text: (min) => `Сынақ кіру ${min} минутқа созылады. Аккаунт ашсаңыз, үлгергеніңіздің бәрі өзіңізде қалады.`,
      left: "Қалды",
      back: "Опораға оралу",
    },
    over: {
      title: "Сынақ уақыты аяқталды",
      text: "Келгеніңізге рақмет. Жалғастыру үшін аккаунт ашыңыз: әңгімелеріңіз бен жазбаларыңыз сақталады.",
    },
    rooms: {
      title: "Бөлмелер тіркелгеннен кейін ашылады",
      text: "Бөлмелерде тірі адамдар сөйлеседі, сондықтан оған аккаунтпен кіреді. Аккаунт ашсаңыз, үлгергеніңіздің бәрі өзіңізде қалады.",
    },
    used: {
      title: "Сынақ кіру қолданылған",
      text: "Бұл құрылғыда сынақ уақыты қолданылып қойған. Аккаунт ашыңыз, бұл тегін.",
      signup: "Аккаунт ашу",
      login: "Кіру",
    },
    unavailable: "Сынақ кіру қазір қолжетімсіз. Аккаунт ашыңыз, бұл тегін.",
    busy: "Әрекет тым көп. Сәл кейінірек көріңіз немесе аккаунт ашыңыз.",
    form: {
      submit: "Аккаунт ашып, сақтау",
      submitting: "Сақтап жатырмыз…",
      sentTitle: "Поштаңызды тексеріңіз",
      sent: (email) => `${email} мекенжайына хат жібердік. Ондағы сілтемені ашсаңыз, аккаунт дайын болады.`,
      sentHint: "Хат бір-екі минуттан кейін келуі мүмкін. «Спам» қалтасын да қараңыз.",
      taken: "Бұл пошта тіркелген. Өз аккаунтыңызға кіріңіз.",
    },
    leave: "Сақтамай шығу",
    haveAccount: "Аккаунтыңыз бар ма?",
    needAccount: "Бұл үшін аккаунт керек. Аккаунт ашсаңыз, бәрі сақталады.",
  },
  en: {
    metaTitle: "Free trial",
    startNote: ["By pressing “Try”, you accept the ", "terms and privacy policy", " and confirm that you are 18 or older."],
    startHint: (min) => `${min} minutes as a guest: everything except rooms. No email needed.`,
    badge: { guest: "Guest", left: "left", keep: "Save" },
    active: {
      title: "You're a guest",
      text: (min) => `The trial lasts ${min} minutes. Create an account and everything you've done stays with you.`,
      left: "Time left",
      back: "Back to Opora",
    },
    over: {
      title: "Your trial time is over",
      text: "Thank you for stopping by. Create an account to continue: your conversations and entries will be kept.",
    },
    rooms: {
      title: "Rooms open after you sign up",
      text: "Real people talk in rooms, so you enter them with an account. Create one and everything you've done stays with you.",
    },
    used: {
      title: "The trial was already used",
      text: "The trial time has already been used on this device. Create an account, it's free.",
      signup: "Create an account",
      login: "Sign in",
    },
    unavailable: "The trial isn't available right now. Create an account, it's free.",
    busy: "Too many attempts. Try a little later or create an account.",
    form: {
      submit: "Create account and save",
      submitting: "Saving…",
      sentTitle: "Check your email",
      sent: (email) => `We sent a letter to ${email}. Open the link in it and your account will be ready.`,
      sentHint: "The letter may take a couple of minutes. Check the spam folder too.",
      taken: "This email is already registered. Sign in to your account.",
    },
    leave: "Leave without saving",
    haveAccount: "Already have an account?",
    needAccount: "You need an account for this. Create one and everything will be kept.",
  },
});
