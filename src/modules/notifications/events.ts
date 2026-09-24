/** Staff events that can also arrive by email, with the default for people who never changed the setting. */
export const emailEvents = {
  decision_approved: { label: "Клиентът одобри документ", emailByDefault: true },
  decision_changes_requested: { label: "Клиентът поиска промяна", emailByDefault: true },
  decision_declined: { label: "Клиентът отказа документ", emailByDefault: true },
  decision_disputed: { label: "Клиентът оспори решение", emailByDefault: true },
  client_message: { label: "Въпрос от клиента", emailByDefault: true },
  revision_expired: { label: "Изтекла оферта или промяна", emailByDefault: true },
  payment_disputed: { label: "Клиентът оспори плащане", emailByDefault: true },
  revision_viewed: { label: "Клиентът отвори документ", emailByDefault: false },
} as const;

export type EmailEventType = keyof typeof emailEvents;
