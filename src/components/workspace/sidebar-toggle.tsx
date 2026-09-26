"use client";

import { useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { SIDEBAR_COOKIE, WORKSPACE_SHELL_ID } from "@/components/workspace/sidebar-state";

/**
 * Collapses the desktop sidebar to icons. It sits centred on the sidebar's right edge, level with the
 * header, and slides with the edge, so it reads as the sidebar's own handle. The layout reads the cookie on the server, so a reload
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
      className="group/toggle fixed top-6 left-60 z-40 hidden size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border bg-card text-muted-foreground shadow-sm outline-none transition-[left,color,background-color] duration-200 after:absolute after:-inset-2 after:content-[''] hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none lg:grid group-data-[sidebar=collapsed]/shell:left-16"
    >
      {/* The icon and hint follow the shell's data-sidebar, so they need no React state. */}
      <ChevronLeft className="size-3.5 group-data-[sidebar=collapsed]/shell:hidden" aria-hidden="true" />
      <ChevronRight className="hidden size-3.5 group-data-[sidebar=collapsed]/shell:block" aria-hidden="true" />
      <span role="tooltip" className="pointer-events-none absolute top-1/2 left-full z-40 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-sidebar px-2 py-1 text-xs text-sidebar-foreground shadow-md group-hover/toggle:block group-focus-visible/toggle:block">
        <span className="group-data-[sidebar=collapsed]/shell:hidden">Скрий менюто</span>
        <span className="hidden group-data-[sidebar=collapsed]/shell:inline">Покажи менюто</span>
        <kbd className="ml-2 font-sans opacity-60">⌘B</kbd>
      </span>
    </button>
  );
}
