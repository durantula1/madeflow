import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Magnifier over an empty list: dashed rows where records would be, and a lens with an ✕.
 * Drawn in the colours of the Pakto mark (three coral shades, navy, the mint accent
 * stroke). Brand colours are fixed on purpose, like the logo, so it reads the same in both themes.
 */
function NoResultsIllustration() {
  return (
    <svg viewBox="0 0 160 116" fill="none" aria-hidden="true" className="mb-3 h-auto w-24">
      <ellipse cx="74" cy="106" rx="50" ry="6" fill="#102b38" opacity=".08" />
      <rect x="30" y="14" width="80" height="86" rx="8" fill="#fff" stroke="#18394C" strokeWidth="1.5" />
      <path d="M38 14h64a8 8 0 0 1 8 8v8H30v-8a8 8 0 0 1 8-8z" fill="#18394C" />
      <circle cx="40" cy="22" r="2.5" fill="#FF765F" />
      <circle cx="48" cy="22" r="2.5" fill="#FF8D78" />
      <g stroke="#18394C" strokeOpacity=".25" strokeWidth="1.4" strokeDasharray="3 3">
        <rect x="40" y="40" width="60" height="12" rx="3" />
        <rect x="40" y="60" width="60" height="12" rx="3" />
        <rect x="40" y="80" width="60" height="12" rx="3" />
      </g>
      <g className="motion-safe:animate-float">
        <path d="M120 90l16 16" stroke="#0e2432" strokeWidth="9" strokeLinecap="round" />
        <circle cx="106" cy="74" r="19" fill="#fffaf0" fillOpacity=".92" />
        <circle cx="106" cy="74" r="19" stroke="#FF765F" strokeWidth="7" />
        <path d="M89 66a19 19 0 0 1 22-10" stroke="#FF8D78" strokeWidth="7" strokeLinecap="round" />
        <path d="M123 82a19 19 0 0 1-21 11" stroke="#B8452F" strokeWidth="7" strokeLinecap="round" />
        <path d="M100 68l12 12M112 68l-12 12" stroke="#18394C" strokeWidth="3" strokeLinecap="round" />
      </g>
      <path d="M126 20c3-6 9-7 9-3s-5 8-2 8 6-9 10-8-1 7 3 6" stroke="#BCEBA8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The one "nothing here" block: the no-results illustration, a title, an optional line of context and
 * optional actions, always at the same size. Callers only choose the frame around it
 * (a card, a dashed box or none); never resize the illustration or the text per page.
 */
export function EmptyResult({
  title,
  description,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Usually `EmptyResultActions`. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-4 py-6 text-center",
        className,
      )}
    >
      <NoResultsIllustration />
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}

const actionClassName =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium transition-colors [&_svg]:size-4";

/** Links under an `EmptyResult`; `primary` is the one action the empty case leads to. */
export function EmptyResultActions({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>
  );
}

export function EmptyResultAction({
  href,
  primary = false,
  children,
}: {
  href: string;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        actionClassName,
        primary
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/85"
          : "bg-background hover:bg-muted",
      )}
    >
      {children}
    </Link>
  );
}
