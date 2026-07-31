"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Mensagem } from "@/lib/types";

/**
 * Global unread indicator (e.g. in the sidebar) — sums unread messages
 * across every conversa the current user participates in. Realtime has no
 * "IN (...)" filter, so this subscribes to all INSERTs on `mensagens` with
 * no filter; RLS still only delivers rows from conversas this user is in.
 */
export function GlobalChatBadge({
  href,
  currentUserId,
  initialCount,
}: {
  href: string;
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
      .channel(`unread-global:${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens" },
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
  }, [currentUserId]);

  return (
    <Link
      href={href}
      className="mb-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
    >
      <MessageCircle className="h-4 w-4" />
      <span className="flex-1">Mensagens</span>
      {count > 0 && (
        <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-copper-600 px-1 text-[10px] font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
