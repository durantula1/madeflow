"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { ProjectScope } from "@/components/team/project-scope";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ProjectOption } from "@/components/workspace/project-combobox";
import { PERMISSION_GROUPS, PRESETS, presetOf, type Permission, type PresetKey } from "@/lib/authz/permissions";
import { cn } from "@/lib/utils";
import { updateTeamMemberAction, type MemberAccessState } from "@/modules/team/actions";

export function PermissionMatrix({ userId, initialPermissions, initialAllProjects, initialProjects, locked = false }: {
  userId: string;
  initialPermissions: Permission[];
  initialAllProjects: boolean;
  /** Currently assigned projects; the rest are searched on demand. */
  initialProjects: ProjectOption[];
  locked?: boolean;
}) {
  const [state, action, pending] = useActionState<MemberAccessState, FormData>(updateTeamMemberAction, {});
  const [permissions, setPermissions] = useState<Permission[]>(initialPermissions);
  const [allProjects, setAllProjects] = useState(initialAllProjects);
  const [selected, setSelected] = useState<ProjectOption[]>(initialProjects);
  const preset = presetOf(permissions);

  useEffect(() => {
    if (state.savedAt) toast.success("Правата са запазени");
    if (state.error) toast.error(state.error);
  }, [state]);

  function toggle(key: Permission, checked: boolean) {
    setPermissions((current) => checked ? [...current, key] : current.filter((item) => item !== key));
  }

  return <form action={action} className="flex flex-col gap-6">
    <input type="hidden" name="userId" value={userId} />
    {permissions.map((key) => <input key={key} type="hidden" name="permissions" value={key} />)}

    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">Шаблон</h2><p className="text-sm text-muted-foreground">Попълва матрицата. После можеш да променяш отделни права.</p></div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{locked ? "Собственик" : preset ? PRESETS[preset].label : "По избор"}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
          <button
            key={key}
            type="button"
            disabled={locked}
            aria-pressed={preset === key}
            onClick={() => setPermissions([...PRESETS[key].permissions])}
            className={cn("flex flex-col items-start rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50", preset === key && "border-primary bg-primary/5 ring-2 ring-primary/30")}
          >
            <span className="font-semibold">{PRESETS[key].label}</span>
            <span className="text-sm text-muted-foreground">{PRESETS[key].description}</span>
          </button>
        ))}
      </div>
    </section>

    <section className="overflow-hidden rounded-xl border">
      {PERMISSION_GROUPS.map((group) => {
        const checkedCount = group.items.filter((item) => locked || permissions.includes(item.key)).length;
        return <div key={group.label}>
          <div className="flex items-center justify-between bg-sidebar px-4 py-2 text-sidebar-foreground">
            <Checkbox
              isDisabled={locked}
              isSelected={checkedCount === group.items.length}
              isIndeterminate={checkedCount > 0 && checkedCount < group.items.length}
              onChange={(checked) => setPermissions((current) => checked ? [...new Set([...current, ...group.items.map((item) => item.key)])] : current.filter((key) => !group.items.some((item) => item.key === key)))}
              className="font-semibold"
            >
              {group.label}
            </Checkbox>
            <span className="text-xs text-sidebar-foreground/60 tabular-nums">{checkedCount}/{group.items.length}</span>
          </div>
          <ul className="divide-y bg-card">
            {group.items.map((item) => (
              <li key={item.key}>
                <Checkbox
                  isDisabled={locked}
                  isSelected={locked || permissions.includes(item.key)}
                  onChange={(checked) => toggle(item.key, checked)}
                  className="w-full px-4 py-3 hover:bg-muted/50"
                >
                  <span className="block font-medium">{item.label}</span>
                  <span className="block text-muted-foreground">{item.description}</span>
                </Checkbox>
              </li>
            ))}
          </ul>
        </div>;
      })}
    </section>

    <section className="flex flex-col gap-3">
      <div><h2 className="font-semibold">Обекти</h2><p className="text-sm text-muted-foreground">Правата важат само за обектите, до които има достъп.</p></div>
      {locked ? <p className="text-sm text-muted-foreground">Собственикът вижда всички обекти.</p> : <ProjectScope allProjects={allProjects} selected={selected} onAllProjectsChange={setAllProjects} onSelectedChange={setSelected} />}
    </section>

    {!locked ? <div className="flex items-center gap-3 border-t pt-4">
      <Button type="submit" isDisabled={pending}>{pending ? "Запазвам…" : "Запази правата"}</Button>
      {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
    </div> : null}
  </form>;
}
