import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Minimum height of the slot a table streams into. The table skeleton and the empty state
 * both reserve it, so "no results" replaces the placeholder without the page collapsing.
 */
export const tableSlotClassName = "min-h-80";

// Left-aligned on purpose: every page starts the same distance from the sidebar.
const widths = {
  full: "",
  wide: "w-full max-w-5xl",
  form: "w-full max-w-3xl",
  narrow: "w-full max-w-2xl",
};

/**
 * Width and vertical rhythm for every workspace page. Pages and their `loading.tsx`
 * both render through it, so sections line up when the skeleton is swapped out.
 */
export function PageShell({ width = "full", loading = false, className, children }: {
  width?: keyof typeof widths;
  /** Marks the region busy and announces loading to screen readers. */
  loading?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-6", widths[width], className)} aria-busy={loading || undefined}>
      {children}
      {loading ? <span role="status" className="sr-only">Зареждане…</span> : null}
    </div>
  );
}

/** Fills the same slot as a table skeleton, so an empty result never makes the page jump. */
export function EmptyState({ title, description, children }: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <Card className={cn("justify-center", tableSlotClassName)}>
      <CardContent className="py-12 text-center">
        <p className="font-medium">{title}</p>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        {children}
      </CardContent>
    </Card>
  );
}
