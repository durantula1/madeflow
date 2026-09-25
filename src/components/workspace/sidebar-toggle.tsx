"use client";

import { useCallback, useEffect } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { SIDEBAR_COOKIE, WORKSPACE_SHELL_ID } from "@/components/workspace/sidebar-state";

/**
 * Collapses the desktop sidebar to icons. The layout reads the cookie on the server, so a reload
 * renders the saved width with no flash; toggling only flips `data-sidebar` on the shell and the
 * CSS does the rest, so nothing re-renders.
 */
export function SidebarToggle() {
  const toggle = useCallback(() => {
    const shell = document.getElementById(WORKSPACE_SHELL_ID);
    if (!shell) return;
    const next = shell.dataset.sidebar === "collapsed" ? "expanded" : "collapsed";
    shell.dataset.sidebar = next;
    document.cookie = `${SIDEBAR_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "b" && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Скрий или покажи страничното меню"
      className="group/toggle relative grid size-8 shrink-0 place-items-center rounded-lg border bg-card text-foreground shadow-xs outline-none transition hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {/* The icon and hint follow the shell's data-sidebar, so they need no React state. */}
      <PanelLeftClose className="size-4 group-data-[sidebar=collapsed]/shell:hidden" aria-hidden="true" />
      <PanelLeftOpen className="hidden size-4 group-data-[sidebar=collapsed]/shell:block" aria-hidden="true" />
      <span role="tooltip" className="pointer-events-none absolute top-full left-0 z-40 mt-1.5 hidden whitespace-nowrap rounded-md bg-sidebar px-2 py-1 text-xs text-sidebar-foreground shadow-md group-hover/toggle:block group-focus-visible/toggle:block">
        <span className="group-data-[sidebar=collapsed]/shell:hidden">Скрий менюто</span>
        <span className="hidden group-data-[sidebar=collapsed]/shell:inline">Покажи менюто</span>
        <kbd className="ml-2 font-sans opacity-60">⌘B</kbd>
      </span>
    </button>
  );
}
