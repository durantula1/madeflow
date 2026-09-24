"use client";

import { vatRateOptions } from "@/modules/change-orders/labels";
import { cn } from "@/lib/utils";

/** Segmented VAT choice; submits `taxRate` with the surrounding form. */
export function VatRateField({
  value,
  defaultValue,
  onChange,
  name = "taxRate",
  className,
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  className?: string;
}) {
  const normalize = (rate: string | undefined) => (rate === undefined ? undefined : String(Number(rate)));
  const current = normalize(value);
  const initial = normalize(defaultValue);
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="mb-1.5 text-sm font-medium">ДДС</legend>
      <div className="grid h-11 grid-cols-3 gap-1 rounded-xl bg-sidebar p-1 shadow-sm">
        {vatRateOptions.map((option) => (
          <label
            key={option.value}
            className="relative flex cursor-pointer items-center justify-center rounded-lg px-2 text-center text-sm font-medium whitespace-nowrap text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground has-checked:bg-primary has-checked:font-semibold has-checked:text-primary-foreground has-checked:shadow-sm has-checked:hover:bg-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              className="sr-only"
              {...(current !== undefined
                ? { checked: current === option.value, onChange: () => onChange?.(option.value) }
                : { defaultChecked: initial === option.value, onChange: () => onChange?.(option.value) })}
            />
            {option.label}
          </label>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        „Без ДДС“ е за фирми, които не са регистрирани по ЗДДС, или за необлагаеми услуги.
      </p>
    </fieldset>
  );
}
