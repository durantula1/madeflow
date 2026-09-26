"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** A status that saves as soon as it changes, for rows in a list. Goes back if the save fails. */
export function StatusSelect({ label, name, value, options, action, fields, success, className }: {
  /** Read by screen readers, e.g. "Статус на Монтаж". */
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  action: (formData: FormData) => Promise<unknown>;
  fields: Record<string, string>;
  success: string;
  className?: string;
}) {
  const [selected, setSelected] = useState(value);
  const [saving, startSaving] = useTransition();

  function change(next: string) {
    if (next === selected) return;
    const previous = selected;
    setSelected(next);
    const formData = new FormData();
    for (const [key, field] of Object.entries(fields)) formData.set(key, field);
    formData.set(name, next);
    startSaving(async () => {
      try {
        const result = await action(formData);
        if (result && typeof result === "object" && "error" in result && typeof result.error === "string") throw new Error(result.error);
        toast.success(success);
      } catch (cause) {
        setSelected(previous);
        toast.error(cause instanceof Error && cause.message ? cause.message : "Статусът не беше записан. Опитай отново.");
      }
    });
  }

  return (
    <Select aria-label={label} selectedKey={selected} onSelectionChange={(key) => change(String(key))} isDisabled={saving}>
      <SelectTrigger className={cn("w-40", saving && "opacity-60", className)}><SelectValue /></SelectTrigger>
      <SelectContent><SelectGroup>{options.map((option) => <SelectItem key={option.value} id={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent>
    </Select>
  );
}
