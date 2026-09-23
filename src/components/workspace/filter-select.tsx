"use client";

import { useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function FilterSelect({ name, value, options, className }: {
  name: string;
  value: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const [selected, setSelected] = useState(value);
  return <>
    <input type="hidden" name={name} value={selected === "none" ? "" : selected} />
    <Select aria-label={name} selectedKey={selected} onSelectionChange={(key) => setSelected(String(key))}>
      <SelectTrigger className={className ?? "h-10"}><SelectValue /></SelectTrigger>
      <SelectContent>{options.map((option) => <SelectItem key={option.value} id={option.value}>{option.label}</SelectItem>)}</SelectContent>
    </Select>
  </>;
}
