"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { LEAD_VIEW_PING_INTERVAL_MS } from "@/lib/vendedor-shared";

type Supabase = ReturnType<typeof createClient>;

// React StrictMode mounts, unmounts and re-mounts every effect in dev. The
// RPC dedupes sequential starts (same lead within 60s -> same view), but two
// *concurrent* starts could both insert. Reusing the in-flight/just-settled
// promise for a lead makes the double-invoke a single call.
const RECENT_START_MS = 2000;
const recentStarts = new Map<string, { at: number; promise: Promise<string | null> }>();

function startView(supabase: Supabase, leadId: string): Promise<string | null> {
  const recent = recentStarts.get(leadId);
  if (recent && Date.now() - recent.at < RECENT_START_MS) return recent.promise;

  const promise = (async () => {
    const { data, error } = await supabase.rpc("lead_view_start", {
      p_lead_id: leadId,
    });
    // null = caller is not a vendedor of this workspace (e.g. the dono): nothing is tracked.
    if (error || !data) return null;
    return data as string;
  })();
  recentStarts.set(leadId, { at: Date.now(), promise });
  return promise;
}

async function pingView(supabase: Supabase, viewId: string) {
  // Best effort — a failed ping only loses a few seconds of the audit trail.
  await supabase.rpc("lead_view_ping", { p_view_id: viewId });
}

/**
 * Audit trail for a vendedor reading a lead: while `active` (detail open)
 * and the tab is visible, registers the opening and pings every 15s. Stops
 * on close / lead change / hidden tab and registers a new opening when the
 * tab becomes visible again.
 */
export function useLeadViewTracking(leadId: string, active: boolean) {
  useEffect(() => {
    if (!active) return;

    const supabase = createClient();
    let cancelled = false;
    let viewId: string | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    // Bumped on every stop so a slow lead_view_start that resolves after the
    // tab was hidden (or the effect cleaned up) cannot start a timer.
    let epoch = 0;

    function stop(sendFinalPing: boolean) {
      epoch += 1;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      // The RPC credits only the time since the last ping (max 20s), so a
      // closing ping adds exactly the tail that the 15s tick would miss.
      if (sendFinalPing && viewId) void pingView(supabase, viewId);
      viewId = null;
    }

    async function begin() {
      const myEpoch = ++epoch;
      const id = await startView(supabase, leadId);
      if (cancelled || myEpoch !== epoch || !id) return;
      viewId = id;
      timer = setInterval(() => {
        if (viewId) void pingView(supabase, viewId);
      }, LEAD_VIEW_PING_INTERVAL_MS);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        if (!timer) void begin();
      } else {
        stop(true);
      }
    }

    if (document.visibilityState === "visible") void begin();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stop(true);
    };
  }, [leadId, active]);
}
