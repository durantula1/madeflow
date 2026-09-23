"use client";

import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Role = "owner" | "office" | "field";
type Project = { id: string; name: string };

export function AccessEditor({ projects, initialRole = "field", initialProjectIds = [], initialFinance = false, invite = false, allowOwnerInvite = false }: {
  projects: Project[]; initialRole?: Role; initialProjectIds?: string[]; initialFinance?: boolean; invite?: boolean; allowOwnerInvite?: boolean;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  const [selected, setSelected] = useState<string[]>(initialProjectIds);
  const [finance, setFinance] = useState(initialFinance);
  const visible = role === "owner" ? "Всички обекти, документи, плащания и фирмени справки" : role === "office" ? "Избраните обекти, документите и финансовото им състояние" : "Избраните обекти, публикуваните документи и етапите";
  const allowed = role === "owner" ? "Пълно управление на обекти, пари, екип и настройки" : role === "office" ? "Подготвя и изпраща документи; управлява етапи" : "Отчита работа и подготвя чернови на промени";

  return <div className="space-y-5">
    <input type="hidden" name="role" value={role} />
    <Field>
      <FieldLabel>Роля</FieldLabel>
      <Select aria-label="Роля" selectedKey={role} onSelectionChange={(key) => setRole(String(key) as Role)}>
        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem id="field">Терен</SelectItem>
          <SelectItem id="office">Офис</SelectItem>
          {invite && allowOwnerInvite ? <SelectItem id="owner">Собственик</SelectItem> : null}
        </SelectContent>
      </Select>
    </Field>
    {role !== "owner" ? <>
      <FieldSet className="rounded-xl border p-4">
        <FieldLegend>Достъп до обекти</FieldLegend>
        <FieldDescription>Избери обектите, по които човекът ще работи.</FieldDescription>
        {projects.length ? projects.map((project) => <Checkbox key={project.id} isSelected={selected.includes(project.id)} onChange={(checked) => setSelected((current) => checked ? [...current, project.id] : current.filter((id) => id !== project.id))}>{project.name}</Checkbox>) : <p className="text-sm text-muted-foreground">Още няма обекти.</p>}
        {selected.map((id) => <input key={id} type="hidden" name="projectIds" value={id} />)}
      </FieldSet>
      <Field orientation="horizontal">
        <Checkbox isSelected={finance} onChange={setFinance}>Може да записва получени плащания</Checkbox>
        {finance ? <input type="hidden" name="canRecordPayments" value="on" /> : null}
      </Field>
    </> : null}
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
      <p className="font-semibold">Преглед на достъпа</p>
      <p className="mt-2"><strong>Ще вижда:</strong> {visible}{role !== "owner" ? `: ${selected.length ? projects.filter((project) => selected.includes(project.id)).map((project) => project.name).join(", ") : "няма избрани обекти"}` : ""}.</p>
      <p className="mt-1"><strong>Ще може да прави:</strong> {allowed}{role !== "owner" && finance ? "; записва плащания" : ""}.</p>
    </div>
  </div>;
}
