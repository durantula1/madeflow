export function documentCode(
  kind: "offer" | "change",
  sequenceNumber: number,
) {
  const prefix = kind === "offer" ? "ОФ" : "ПР";
  return `${prefix}-${String(sequenceNumber).padStart(3, "0")}`;
}

export function documentNoun(kind: "offer" | "change") {
  return kind === "offer" ? "Оферта" : "Промяна";
}

export function scheduleLabel(
  kind: "offer" | "change",
  type: string,
  days: number | null,
  deadline?: string | null,
) {
  if (deadline) return kind === "offer" ? `До ${deadline}` : `Нов срок: ${deadline}`;
  if (type === "days") {
    return kind === "offer" ? `${days ?? 0} дни` : `+ ${days ?? 0} дни`;
  }
  if (type === "unknown") {
    return kind === "offer" ? "Още не е уточнен" : "Още не е известно";
  }
  return kind === "offer" ? "Без срок" : "Без промяна";
}
