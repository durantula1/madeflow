"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  label,
  icon,
  activeHref,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  activeHref?: string;
}) {
  const pathname = usePathname();
  const active = activeHref
    ? href === activeHref
    : href === "/app"
      ? pathname === href
      : pathname.startsWith(href);
  return (
    <Link
      href={href}
      prefetch={true}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <NavPending />
    </Link>
  );
}

function NavPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className="absolute top-1/2 right-1.5 size-1.5 -translate-y-1/2 rounded-full bg-sidebar-primary"
    />
  );
}
