type DiffLine = { description: string; quantity: string | number; unit: string | null; unitPrice: string | number; lineTotal: string | number };
type DiffRevision = { revisionNumber: number; total: string | number; taxRate: string | number; agreedDeadline: string | null; currency: string; lineItems: DiffLine[] };

export type RevisionDiff = {
  previousNumber: number;
  totalBefore: number;
  totalAfter: number;
  currency: string;
  changes: string[];
};

const key = (line: DiffLine) => line.description.trim().toLocaleLowerCase("bg-BG");
const amount = (value: string | number) => Number(value).toFixed(2);

/** Plain-language list of what changed between two versions the client saw. */
export function summarizeRevisionDiff(previous: DiffRevision, next: DiffRevision): RevisionDiff {
  const changes: string[] = [];
  const before = new Map(previous.lineItems.map((line) => [key(line), line]));
  const after = new Map(next.lineItems.map((line) => [key(line), line]));
  for (const [id, line] of after) {
    const old = before.get(id);
    if (!old) changes.push(`Добавено: ${line.description} (${amount(line.lineTotal)} ${next.currency})`);
    else if (Number(old.quantity) !== Number(line.quantity) || Number(old.unitPrice) !== Number(line.unitPrice) || (old.unit ?? "") !== (line.unit ?? "")) {
      changes.push(`Променено: ${line.description} — ${Number(old.quantity)} ${old.unit ?? ""} × ${amount(old.unitPrice)} → ${Number(line.quantity)} ${line.unit ?? ""} × ${amount(line.unitPrice)}`.replace(/\s+/g, " "));
    }
  }
  for (const [id, line] of before) if (!after.has(id)) changes.push(`Премахнато: ${line.description}`);
  if (Number(previous.taxRate) !== Number(next.taxRate)) changes.push(`ДДС: ${Number(previous.taxRate)}% → ${Number(next.taxRate)}%`);
  if (previous.agreedDeadline !== next.agreedDeadline) changes.push(`Срок: ${previous.agreedDeadline ?? "—"} → ${next.agreedDeadline ?? "—"}`);
  return { previousNumber: previous.revisionNumber, totalBefore: Number(previous.total), totalAfter: Number(next.total), currency: next.currency, changes };
}
