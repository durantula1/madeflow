"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const messages: Record<string, string> = {
  "invite-created": "Поканата е създадена",
  "project-created": "Обектът е създаден",
  "offer-created": "Офертата е създадена",
  "change-created": "Промяната е създадена",
  "revision-saved": "Новата версия е запазена",
};

export function ActionNotice() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const notice = searchParams.get("notice");
  useEffect(() => {
    if (!notice || !messages[notice]) return;
    toast.success(messages[notice]);
    const url = new URL(window.location.href);
    url.searchParams.delete("notice");
    window.history.replaceState(window.history.state, "", url.toString());
  }, [pathname, notice]);
  return null;
}
