"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function LiveNotifications({ userId }: { userId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let disposed = false;
    const channel = supabase.channel(`staff:${userId}`, { config: { private: true } })
      .on("broadcast", { event: "refresh" }, () => router.refresh());
    void supabase.auth.getSession().then(async ({ data }) => {
      if (disposed) return;
      if (data.session?.access_token) await supabase.realtime.setAuth(data.session.access_token);
      channel.subscribe();
    });
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 30000);
    return () => { disposed = true; window.clearInterval(interval); void supabase.removeChannel(channel); };
  }, [router, userId]);
  return null;
}
