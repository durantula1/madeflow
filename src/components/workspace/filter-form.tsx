"use client";

import Form from "next/form";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { startNavigationProgress } from "@/components/workspace/navigation-progress";

/**
 * GET form for list filters. `next/form` submits as a client navigation (the layout stays,
 * the list's skeleton shows) instead of the full page reload a plain `<form>` does.
 */
export function FilterForm({ className, children }: { className?: string; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <Form
      action={pathname}
      className={className}
      onSubmit={(event) => {
        const params = new URLSearchParams();
        for (const [key, value] of new FormData(event.currentTarget)) if (typeof value === "string") params.append(key, value);
        startNavigationProgress(`${pathname}?${params}`);
      }}
    >
      {children}
    </Form>
  );
}
