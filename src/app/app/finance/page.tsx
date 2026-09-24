import { Suspense } from "react";

import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldLabel } from "@/components/ui/field";
import { FilterSelect } from "@/components/workspace/filter-select";
import { FilterBar } from "@/components/workspace/list-filters";
import { PageHeader } from "@/components/workspace/page/page-header";
import { EmptyState, PageShell } from "@/components/workspace/page/page-shell";
import { ProjectCombobox } from "@/components/workspace/project-combobox";
import { getCurrentMember } from "@/lib/authz/project-access";
import { can } from "@/lib/authz/permissions";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { parsePage } from "@/lib/pagination";
import { defaultReceiptRange, type ReceiptFilters } from "@/modules/finance/queries";
import { getProjectOption } from "@/modules/projects/queries";
import { FinanceContent, FinanceContentSkeleton, financeFilterFields as fields, kindOptions, methodOptions } from "./finance-content";

const datePattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export default async function FinancePage({ searchParams }: PageProps<"/app/finance">) {
  const context = await requireTenantContext();
  const member = await getCurrentMember(context);
  if (!can(member, "finance.view")) return <PageShell><PageHeader page="finance" /><EmptyState title="Нямаш достъп до месечната справка." /></PageShell>;
  const params = await searchParams;
  const defaults = defaultReceiptRange();
  const requestedFrom = typeof params.from === "string" && datePattern.test(params.from) ? params.from : defaults.from;
  const requestedTo = typeof params.to === "string" && datePattern.test(params.to) ? params.to : defaults.to;
  const from = requestedFrom <= requestedTo ? requestedFrom : defaults.from;
  const to = requestedFrom <= requestedTo ? requestedTo : defaults.to;
  const kind = kindOptions.some((item) => item.value === params.kind) ? String(params.kind) : "all";
  const method = methodOptions.some((item) => item.value === params.method) ? String(params.method) : "all";
  const page = parsePage(params.page);
  const project = await getProjectOption(context, typeof params.projectId === "string" ? params.projectId : undefined);
  const projectId = project?.id ?? "all";
  const filters = { from, to, projectId: project?.id, kind: kind === "all" ? undefined : kind as ReceiptFilters["kind"], method: method === "all" ? undefined : method };
  const searchState = { from, to, projectId, kind, method };

  return <PageShell>
    <PageHeader page="finance" />
    <FilterBar>
      <Field className={fields.from.className}><FieldLabel>{fields.from.label}</FieldLabel><DatePicker name="from" defaultValue={from} aria-label={fields.from.label} /></Field>
      <Field className={fields.to.className}><FieldLabel>{fields.to.label}</FieldLabel><DatePicker name="to" defaultValue={to} aria-label={fields.to.label} /></Field>
      <Field className={fields.project.className}><FieldLabel>{fields.project.label}</FieldLabel><ProjectCombobox name="projectId" allLabel="Всички обекти" defaultValue={project} /></Field>
      <Field className={fields.kind.className}><FieldLabel>{fields.kind.label}</FieldLabel><FilterSelect name="kind" value={kind} options={kindOptions} /></Field>
      <Field className={fields.method.className}><FieldLabel>{fields.method.label}</FieldLabel><FilterSelect name="method" value={method} options={methodOptions} /></Field>
    </FilterBar>
    <Suspense key={JSON.stringify({ ...searchState, page })} fallback={<FinanceContentSkeleton />}>
      <FinanceContent context={context} filters={filters} page={page} searchState={searchState} />
    </Suspense>
  </PageShell>;
}
