import { Badge } from "@/components/ui/badge";

const statusLabels: Record<string, string> = {
  draft: "Чернова",
  sent: "Изпратена",
  viewed: "Прегледана",
  approved: "Одобрена",
  declined: "Отказана",
  changes_requested: "Иска промяна",
};

export function DocumentStatusBadge({ status }: { status: string | null }) {
  const variant =
    status === "approved"
      ? "approved"
      : status === "sent"
        ? "sent"
        : "secondary";

  return (
    <Badge variant={variant}>
      {statusLabels[status ?? ""] ?? status ?? "—"}
    </Badge>
  );
}
