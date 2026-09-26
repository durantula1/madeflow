"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import type { DiscountType } from "@/modules/change-orders/pricing";
import { segmentClassName, segmentGroupClassName } from "@/components/workspace/segmented";

const options: Array<{ value: "" | DiscountType; label: string }> = [
  { value: "", label: "Няма" },
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
      <div className="flex flex-wrap items-center gap-2">
        <div className={segmentGroupClassName}>
          {options.map((option) => (
            <button
              key={option.value || "none"}
              type="button"
              aria-pressed={type === option.value}
              aria-label={option.value ? undefined : "Без отстъпка"}
              onClick={() => update(option.value, option.value ? value : "")}
              className={segmentClassName}
            >
              {option.label}
            </button>
          ))}
        </div>
        {type ? (
          <label className="flex h-10 w-full items-center rounded-lg border bg-background px-3 sm:w-36">
            <span className="sr-only">{type === "percent" ? "Процент отстъпка" : "Сума на отстъпката"}</span>
            <Input
              name="discountValue"
              value={value}
              inputMode="decimal"
              placeholder="0"
              autoFocus
              onChange={(event) => update(type, event.target.value.replace(",", "."))}
              className="h-7 min-w-0 flex-1 border-0 bg-transparent px-0 text-right text-base tabular-nums focus-visible:ring-0 sm:text-sm"
            />
            <span className="shrink-0 pl-2 text-sm text-muted-foreground">{type === "percent" ? "%" : currency}</span>
          </label>
        ) : <input type="hidden" name="discountValue" value="" />}
      </div>
    </fieldset>
  );
}
