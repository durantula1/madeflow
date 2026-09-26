"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * "Всички" / "Нито едно" for a group of switches in the same form. It clicks the switches that
 * need to flip, so the form sees ordinary changes and saves them in one go.
 */
export function SwitchGroupToggle({ names }: { names: string[] }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [allOn, setAllOn] = useState(false);

  const inputs = () => {
    const form = anchor.current?.closest("form");
    return form ? names.map((name) => form.elements.namedItem(name)).filter((item): item is HTMLInputElement => item instanceof HTMLInputElement) : [];
  };

  useEffect(() => {
    const form = anchor.current?.closest("form");
    const sync = () => setAllOn(inputs().every((input) => input.checked));
    sync();
    form?.addEventListener("change", sync);
    return () => form?.removeEventListener("change", sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the names never change for a mounted group
  }, []);

  return (
    <span ref={anchor}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onPress={() => inputs().filter((input) => input.checked === allOn).forEach((input) => input.click())}
      >
        {allOn ? "Изключи всички" : "Включи всички"}
      </Button>
    </span>
  );
}
