import { Badge } from "@/components/ui/badge";

export const documentStatusLabels: Record<string, string> = {
  draft: "Чернова",
  sent: "Изпратена",
  viewed: "Прегледана",
  approved: "Одобрена",
  declined: "Отказана",
  changes_requested: "Иска промяна",
  expired: "Изтекла",
  superseded: "Заменена",
  canceled: "Анулирана",
};

/** Sand: waiting on the client. Coral: needs the team. Mint: done. Same soft tones as the project page. */
const variants: Record<string, "success-soft" | "warning-soft" | "danger-soft" | "secondary"> = {
  sent: "warning-soft",
  viewed: "warning-soft",
  approved: "success-soft",
  declined: "danger-soft",
  changes_requested: "danger-soft",
  expired: "danger-soft",
};

export function DocumentStatusBadge({ status, className }: { status: string | null; className?: string }) {
  return (
    <Badge variant={variants[status ?? ""] ?? "secondary"} className={className}>
      {documentStatusLabels[status ?? ""] ?? status ?? "—"}
    </Badge>
  );
}
