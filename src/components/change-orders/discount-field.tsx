"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import type { DiscountType } from "@/modules/change-orders/pricing";
import { cn } from "@/lib/utils";

const options: Array<{ value: "" | DiscountType; label: string }> = [
  { value: "", label: "Без отстъпка" },
  { value: "percent", label: "%" },
  { value: "amount", label: "Сума" },
];

/** Offer-level discount; submits `discountType` and `discountValue`. Controlled when `onChange` is given. */
export function DiscountField({ defaultType = "", defaultValue = "", currency = "EUR", onChange }: {
  defaultType?: "" | DiscountType;
  defaultValue?: string;
  currency?: string;
  onChange?: (type: "" | DiscountType, value: string) => void;
}) {
  const [type, setType] = useState<"" | DiscountType>(defaultType);
  const [value, setValue] = useState(defaultValue);
  function update(nextType: "" | DiscountType, nextValue: string) {
    setType(nextType);
    setValue(nextValue);
    onChange?.(nextType, nextValue);
  }
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-sm font-medium">Отстъпка</legend>
      <input type="hidden" name="discountType" value={type} />
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <div className="grid h-11 grid-cols-[1.6fr_1fr_1fr] gap-1 rounded-xl bg-sidebar p-1 shadow-sm">
          {options.map((option) => (
            <button
              key={option.value || "none"}
              type="button"
              aria-pressed={type === option.value}
              onClick={() => update(option.value, option.value ? value : "")}
              className={cn(
                "rounded-lg px-2 text-sm font-medium whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                type === option.value ? "bg-primary font-semibold text-primary-foreground shadow-sm" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {type ? (
          <label className="flex h-11 items-center rounded-lg border bg-background px-3">
            <span className="sr-only">{type === "percent" ? "Процент отстъпка" : "Сума на отстъпката"}</span>
            <Input
              name="discountValue"
              value={value}
              inputMode="decimal"
              placeholder="0"
              autoFocus
              onChange={(event) => update(type, event.target.value.replace(",", "."))}
              className="h-9 min-w-0 flex-1 border-0 bg-transparent px-0 text-right text-base tabular-nums focus-visible:ring-0 sm:text-sm"
            />
            <span className="shrink-0 pl-2 text-sm text-muted-foreground">{type === "percent" ? "%" : currency}</span>
          </label>
        ) : <input type="hidden" name="discountValue" value="" />}
      </div>
    </fieldset>
  );
}
