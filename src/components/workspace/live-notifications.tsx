"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";

export function LiveNotifications({ userId }: { userId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let disposed = false;
    const channel = supabase.channel(`staff:${userId}`, { config: { private: true } })
      .on("broadcast", { event: "refresh" }, ({ payload }) => {
        const eventType = payload && typeof payload === "object" && "event_type" in payload ? String(payload.event_type) : "";
        if (eventType === "permissions_changed") toast("Правата ти са променени");
        else if (eventType === "owner_role_changed" || eventType === "owner_promoted" || eventType === "membership_disabled") {
          const title = "title" in payload && payload.title ? String(payload.title) : "Правата ти са променени";
          toast(title);
        }
        router.refresh();
      });
    void supabase.auth.getSession().then(async ({ data }) => {
      if (disposed) return;
      if (data.session?.access_token) await supabase.realtime.setAuth(data.session.access_token);
      // Broadcasts sent while the channel was down are lost, so catch up once it reconnects.
      let connectedBefore = false;
      channel.subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        if (connectedBefore) router.refresh();
        connectedBefore = true;
      });
    });
    // A background tab may have been throttled or asleep; catch up when it comes back after a while.
    let hiddenAt = 0;
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 30000) router.refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => { disposed = true; document.removeEventListener("visibilitychange", onVisibilityChange); void supabase.removeChannel(channel); };
  }, [router, userId]);
  return null;
}
