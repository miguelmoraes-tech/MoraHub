"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Mensagem } from "@/lib/types";

/**
 * Live unread-count badge for a single conversa. Seeded from a server-fetched
 * count and bumped in real time while the host list page stays open — the
 * count itself always re-syncs to the fresh server value on next navigation,
 * so this only needs to grow, never shrink/reconcile client-side.
 */
export function ChatUnreadBadge({
  conversaId,
  currentUserId,
  initialCount,
}: {
  conversaId: string;
  currentUserId: string;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  // Re-sync during render (not an effect) when the server-fetched value
  // changes across navigations — same pattern as useActionSuccess.
  const [lastInitialCount, setLastInitialCount] = useState(initialCount);
  if (initialCount !== lastInitialCount) {
    setLastInitialCount(initialCount);
    setCount(initialCount);
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`unread-badge:${conversaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensagens",
          filter: `conversa_id=eq.${conversaId}`,
        },
        (payload) => {
          const nova = payload.new as Mensagem;
          if (nova.remetente_id !== currentUserId) {
            setCount((c) => c + 1);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversaId, currentUserId]);

  if (count <= 0) return null;

  return (
    <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-copper-600 px-1 text-[10px] font-semibold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
