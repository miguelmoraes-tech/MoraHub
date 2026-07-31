import { ConversaChatPage } from "@/components/chat/conversa-chat-page";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ conversaId: string }>;
}) {
  const { conversaId } = await params;
  return <ConversaChatPage conversaId={conversaId} />;
}
