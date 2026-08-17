export const orderStageLabels: Record<string, string> = {
  draft: "Чернова",
  awaiting_approval: "Чака одобрение",
  approved: "Одобрена",
  in_production: "В производство",
  ready_for_installation: "Готова за монтаж",
  installed: "Монтирана",
  completed: "Завършена",
  service: "Сервиз",
};

export const orderStageClasses: Record<string, string> = {
  draft: "bg-stone-100 text-stone-700",
  awaiting_approval: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  in_production: "bg-blue-100 text-blue-800",
  ready_for_installation: "bg-violet-100 text-violet-800",
  installed: "bg-teal-100 text-teal-800",
  completed: "bg-green-100 text-green-800",
  service: "bg-rose-100 text-rose-800",
};

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("bg-BG", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
