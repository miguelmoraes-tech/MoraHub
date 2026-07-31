import { ConversaChatPage } from "@/components/chat/conversa-chat-page";

export default async function ContadorChatPage({
  params,
}: {
  params: Promise<{ conversaId: string }>;
}) {
  const { conversaId } = await params;
  return (
    <ConversaChatPage
      conversaId={conversaId}
      backHref="/colaborador/contador"
      backLabel="Painel do contador"
    />
  );
}
