import { defineMessages } from "./config";

// Игра «5-4-3-2-1». Шаги идут по порядку: 5, 4, 3, 2, 1.
type Sense = { what: string; hint: string };

export const groundingMessages = defineMessages({
  ru: {
    senses: [
      { what: "вещей, которые вы видите", hint: "Например: чашка, окно, свет на стене…" },
      { what: "вещи, которые можно потрогать", hint: "Ткань одежды, поверхность стола, свои ладони…" },
      { what: "звука, которые вы слышите", hint: "Шум за окном, своё дыхание, гул техники…" },
      { what: "запаха, которые замечаете", hint: "Если не чувствуете — вспомните любимые." },
      { what: "вкус, который ощущаете", hint: "Или сделайте глоток воды и прислушайтесь." },
    ] as Sense[],
    doneTitle: "Вы здесь. Сейчас.",
    doneBody:
      "Заметьте, как вы себя чувствуете. Даже если тревога не ушла совсем, у вас есть опора: то, что вокруг, и ваше тело.",
    again: "Ещё раз",
    noticed: "Заметил(а)",
    tip: "Найдите взглядом или ощущением и нажмите, не торопясь.",
  },
  kk: {
    senses: [
      { what: "нәрсені көзбен табыңыз", hint: "Мысалы: шыныаяқ, терезе, қабырғадағы жарық…" },
      { what: "нәрсені қолмен ұстап көріңіз", hint: "Киімнің матасы, үстелдің беті, өз алақаныңыз…" },
      { what: "дыбысқа құлақ салыңыз", hint: "Терезе сыртындағы шу, өз тынысыңыз, техниканың гүрілі…" },
      { what: "иісті байқаңыз", hint: "Иіс сезілмесе, өзіңіз жақсы көретін иістерді еске түсіріңіз." },
      { what: "дәмді сезініңіз", hint: "Немесе бір ұрттам су ішіп, дәміне назар аударыңыз." },
    ],
    doneTitle: "Сіз осындасыз. Дәл қазір.",
    doneBody:
      "Өзіңізді қалай сезініп тұрғаныңызды байқаңыз. Мазасыздық толық басылмаса да, сізде тірек бар: айналаңыздағы дүние және өз денеңіз.",
    again: "Тағы бір рет",
    noticed: "Байқадым",
    tip: "Көзбен не сезім арқылы тауып, асықпай басыңыз.",
  },
  en: {
    senses: [
      { what: "things you can see", hint: "A cup, a window, light on the wall…" },
      { what: "things you can touch", hint: "The fabric of your clothes, the tabletop, your own palms…" },
      { what: "sounds you can hear", hint: "Noise outside, your own breathing, the hum of appliances…" },
      { what: "smells you notice", hint: "If you can't smell anything, recall a few you love." },
      { what: "taste you can sense", hint: "Or take a sip of water and pay attention." },
    ],
    doneTitle: "You're here. Now.",
    doneBody:
      "Notice how you feel. Even if the anxiety hasn't fully gone, you have something to lean on: what's around you, and your body.",
    again: "Once more",
    noticed: "Noticed",
    tip: "Find it with your eyes or senses, then tap. Take your time.",
  },
});
