export const workspacePageCopy = {
  dashboard: {
    eyebrow: "Работен преглед",
    title: "Какво чака действие",
    description:
      "Офертата е първият документ. Промяната идва след като клиентът я одобри.",
  },
  projects: {
    eyebrow: "Работни места",
    title: "Обекти",
    description: "Клиент, адрес и всички договорени промени на едно място.",
  },
  offers: {
    eyebrow: "Първи документ",
    title: "Оферти",
    description: "Обхват, редове и цена, преди да има промяна.",
  },
  changes: {
    eyebrow: "Допълнителна работа",
    title: "Промени",
    description: "Само след одобрена оферта на същия обект.",
  },
  notifications: {
    eyebrow: "Комуникация",
    title: "Известия",
    description: "Решенията на клиента по изпратени оферти и промени.",
  },
  team: {
    eyebrow: "Управление на достъпа",
    title: "Екип",
    description: "Хора, покани и права за работа по обектите.",
  },
  settings: {
    eyebrow: "Workspace",
    title: "Настройки",
    description: "Фирмени данни и работни шаблони.",
  },
  newProject: {
    title: "Нов обект",
    description: "Добави мястото и човека, който може да одобрява.",
  },
  newOffer: {
    title: "Нова оферта",
    description:
      "Попълваш редовете, преглеждаш сумата и чак тогава я създаваш.",
  },
  newChange: {
    eyebrow: "Бързо документиране",
    title: "Нова промяна",
    description: "Разликата спрямо вече одобрена оферта на същия обект.",
  },
} as const;

export type WorkspacePage = keyof typeof workspacePageCopy;
