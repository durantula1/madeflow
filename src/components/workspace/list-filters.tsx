import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FilterSelect } from "@/components/workspace/filter-select";

export function ListFilters({ query, status, statusOptions, projectId, projects, placeholder }: {
  query: string;
  status: string;
  statusOptions: { value: string; label: string }[];
  projectId?: string;
  projects?: { id: string; name: string }[];
  placeholder: string;
}) {
  return <form className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
    <Field className="min-w-52 flex-1"><FieldLabel htmlFor="list-search">Търси</FieldLabel><Input id="list-search" name="q" defaultValue={query} placeholder={placeholder} className="h-10" /></Field>
    {projects ? <Field className="min-w-44 flex-1"><FieldLabel>Обект</FieldLabel><FilterSelect name="projectId" value={projectId ?? "all"} options={[{ value: "all", label: "Всички обекти" }, ...projects.map((project) => ({ value: project.id, label: project.name }))]} /></Field> : null}
    <Field className="min-w-44 flex-1"><FieldLabel>Статус</FieldLabel><FilterSelect name="status" value={status} options={statusOptions} /></Field>
    <Button type="submit" variant="outline" className="h-10">Приложи</Button>
  </form>;
}

export function ListPagination({ path, params, page, hasNext }: {
  path: string;
  params: Record<string, string>;
  page: number;
  hasNext: boolean;
}) {
  if (page === 1 && !hasNext) return null;
  const href = (target: number) => {
    const search = new URLSearchParams(params);
    search.set("page", String(target));
    return `${path}?${search}`;
  };
  return <nav aria-label="Страници" className="mt-5 flex items-center justify-between text-sm">
    {page > 1 ? <Link className="rounded-lg border px-4 py-2 hover:bg-muted" href={href(page - 1)}>← Предишна</Link> : <span />}
    <span className="text-muted-foreground">Страница {page}</span>
    {hasNext ? <Link className="rounded-lg border px-4 py-2 hover:bg-muted" href={href(page + 1)}>Следваща →</Link> : <span />}
  </nav>;
}
