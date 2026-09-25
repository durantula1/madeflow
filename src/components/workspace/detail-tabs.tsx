"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import { Tabs } from "@/components/ui/tabs";

const SelectTab = createContext<(tab: string) => void>(() => {});

/**
 * Tabs of a detail page (project, document) switch on the client: every panel is already
 * rendered, so a server round trip (re-running all its queries) only to change `?tab=` is
 * wasted. The URL is kept in sync with `replaceState` so a reload or a shared link opens the
 * same tab.
 */
export function DetailTabs({ defaultTab, children }: { defaultTab: string; children: ReactNode }) {
  const [selected, setSelected] = useState(defaultTab);
  const select = useCallback((tab: string) => {
    setSelected(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(window.history.state, "", url);
  }, []);
  return (
    <SelectTab value={select}>
      <Tabs selectedKey={selected} onSelectionChange={(key) => select(String(key))}>{children}</Tabs>
    </SelectTab>
  );
}

/** A "see all" link inside a panel that opens another tab of the same page. */
export function DetailTabLink({ tab, className, children }: { tab: string; className?: string; children: ReactNode }) {
  const select = useContext(SelectTab);
  return <button type="button" className={className} onClick={() => select(tab)}>{children}</button>;
}
