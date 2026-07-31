import { ConversaChatPage } from "@/components/chat/conversa-chat-page";

export default async function AdvogadoChatPage({
  params,
}: {
  params: Promise<{ conversaId: string }>;
}) {
  const { conversaId } = await params;
  return (
    <ConversaChatPage
      conversaId={conversaId}
      backHref="/colaborador/advogado"
      backLabel="Painel do advogado"
    />
  );
}
