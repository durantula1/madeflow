import type { Metadata } from "next";
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
      <header className="border-b border-sidebar-border bg-sidebar px-4 py-4 text-sidebar-foreground">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="font-semibold">MadeFlow</span>
          <span className="text-xs text-white/55">Защитен преглед</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">{children}</main>
    </div>
  );
}
