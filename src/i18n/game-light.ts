import { defineMessages } from "./config";

// Игра «Рисовать светом».
export const lightMessages = defineMessages({
  ru: {
    canvas: "Холст для рисования",
    mandala: "Мандала",
    free: "Свободно",
    clear: "Очистить",
    note: "Линии растворяются сами. Ничего не нужно сохранять или делать красиво.",
    brushes: { line: "Линия", mist: "Туман", stars: "Звёзды" },
    fadeLabel: "Исчезают",
    fades: { fast: "Быстро", slow: "Медленно", never: "Не исчезают" },
    save: "Сохранить картинку",
    saved: "Картинка сохранена в загрузки",
  },
  kk: {
    canvas: "Сурет салуға арналған кенеп",
    mandala: "Мандала",
    free: "Еркін",
    clear: "Тазарту",
    note: "Сызықтар өздігінен еріп кетеді. Ештеңені сақтаудың да, әдемі етудің де қажеті жоқ.",
    brushes: { line: "Сызық", mist: "Тұман", stars: "Жұлдыздар" },
    fadeLabel: "Жоғалуы",
    fades: { fast: "Тез", slow: "Баяу", never: "Жоғалмайды" },
    save: "Суретті сақтау",
    saved: "Сурет жүктелімдерге сақталды",
  },
  en: {
    canvas: "Drawing canvas",
    mandala: "Mandala",
    free: "Freehand",
    clear: "Clear",
    note: "The lines fade on their own. Nothing to save, nothing has to look nice.",
    brushes: { line: "Line", mist: "Mist", stars: "Stars" },
    fadeLabel: "Fading",
    fades: { fast: "Fast", slow: "Slow", never: "Stays" },
    save: "Save picture",
    saved: "Picture saved to downloads",
  },
});
