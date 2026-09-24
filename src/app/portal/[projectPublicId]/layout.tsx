import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
export const metadata: Metadata = {
  title: "Преглед на промяна · MadeFlow",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f4ec] text-foreground">
      <header className="border-b border-sidebar-border bg-sidebar px-4 py-3 text-sidebar-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Wordmark inverse href={null} />
          <span className="inline-flex items-center gap-1.5 text-xs text-white/55"><ShieldCheck className="size-3.5" /> Защитен преглед</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
