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

/** `2026-10-31` → `31.10.2026`; anything else is returned unchanged. */
export function formatDay(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split("-").reverse().join(".") : value;
}

export function scheduleLabel(
  kind: "offer" | "change",
  type: string,
  days: number | null,
  deadline?: string | null,
) {
  if (deadline) {
    const day = formatDay(deadline);
    return kind === "offer" ? `До ${day}` : `Нов срок: ${day}`;
  }
  if (type === "days") {
    return kind === "offer" ? `${days ?? 0} дни` : `+ ${days ?? 0} дни`;
  }
  if (type === "unknown") {
    return kind === "offer" ? "Още не е уточнен" : "Още не е известно";
  }
  return kind === "offer" ? "Без срок" : "Без промяна";
}

/** A 0% rate means the company does not charge VAT on this document. */
export function vatLabel(taxRate: string | number) {
  return Number(taxRate) ? `ДДС ${Number(taxRate)}%` : "Без ДДС";
}

export function totalLabel(taxRate: string | number, prefix = "Обща цена") {
  return Number(taxRate) ? `${prefix} с ДДС` : `${prefix} (не се начислява ДДС)`;
}

export const vatRateOptions = [
  { value: "20", label: "ДДС 20%" },
  { value: "9", label: "ДДС 9%" },
  { value: "0", label: "Без ДДС" },
] as const;
