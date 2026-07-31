"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { ChatUnreadBadge } from "@/components/chat/chat-unread-badge";

export function ChatLink({
  href,
  conversaId,
  currentUserId,
  initialUnread,
}: {
  href: string;
  conversaId: string;
  currentUserId: string;
  initialUnread: number;
}) {
  return (
    <Link
      href={href}
      className="flex shrink-0 items-center gap-1 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
    >
      <MessageCircle className="h-3.5 w-3.5" />
      <ChatUnreadBadge
        conversaId={conversaId}
        currentUserId={currentUserId}
        initialCount={initialUnread}
      />
    </Link>
  );
}
