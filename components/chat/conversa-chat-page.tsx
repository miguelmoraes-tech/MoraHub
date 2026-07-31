import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ChatWindow } from "@/components/chat/chat-window";
import { StatusChip } from "@/components/status-chip";
import type {
  ColaboradorPapel,
  Conversa,
  ConversaParticipanteInfo,
  Mensagem,
} from "@/lib/types";

const PAPEL_LABEL: Record<ColaboradorPapel, string> = {
  contador: "Contador",
  advogado: "Advogado",
  financeiro: "Financeiro",
  rh: "RH",
};

export async function ConversaChatPage({
  conversaId,
  backHref,
  backLabel,
}: {
  conversaId: string;
  /** Omit to auto-derive from the caller's role in this conversa — dono
   * goes back to /juridico, a financeiro membro back to /contas-pagar.
   * Advogado/contador workspaces always pass this explicitly to stay
   * inside their own WorkspaceShell instead. */
  backHref?: string;
  backLabel?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-zinc-400">Sessão expirada. Faça login novamente.</p>
      </div>
    );
  }

  // RLS ("participantes da conversa") already scopes this to null if the
  // caller isn't dono_id or membro_id — no extra check needed here.
  const { data: conversa } = (await supabase
    .from("conversas")
    .select("*")
    .eq("id", conversaId)
    .maybeSingle()) as { data: Conversa | null };

  const resolvedBackHref =
    backHref ??
    (conversa && user.id === conversa.dono_id
      ? "/juridico"
      : conversa?.papel === "rh"
        ? "/rh"
        : "/contas-pagar");
  const resolvedBackLabel =
    backLabel ??
    (conversa && user.id === conversa.dono_id
      ? "Voltar ao Jurídico & Contábil"
      : conversa?.papel === "rh"
        ? "Voltar ao RH"
        : "Voltar ao financeiro");

  if (!conversa) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link
          href={resolvedBackHref}
          className="mb-4 flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {resolvedBackLabel}
        </Link>
        <p className="text-sm text-zinc-400">
          Esta conversa não existe ou você não tem acesso a ela.
        </p>
      </div>
    );
  }

  const [{ data: mensagens }, { data: participanteRows }] = (await Promise.all([
    supabase
      .from("mensagens")
      .select("*")
      .eq("conversa_id", conversaId)
      .order("created_at", { ascending: true }),
    supabase.rpc("get_conversa_participante_info", {
      p_conversa_id: conversaId,
    }),
  ])) as [{ data: Mensagem[] | null }, { data: ConversaParticipanteInfo[] | null }];

  const participante = participanteRows?.[0] ?? null;
  const podeEnviar = participante?.status === "ativo";
  const nomeExibido =
    participante?.nome || participante?.email || "Participante";

  return (
    <div className="mx-auto w-full max-w-2xl px-0 sm:px-6 sm:py-6">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur sm:rounded-t-xl sm:border-x">
        <Link
          href={resolvedBackHref}
          className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {resolvedBackLabel}
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
            <MessageCircle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-100">
              {nomeExibido}
            </p>
            {participante?.nome && participante?.email && (
              <p className="truncate text-xs text-zinc-500">{participante.email}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {participante?.status === "removido" && (
            <StatusChip tone="rose">Vínculo encerrado</StatusChip>
          )}
          <StatusChip tone="copper">{PAPEL_LABEL[conversa.papel]}</StatusChip>
        </div>
      </div>

      <div className="border-zinc-800 bg-zinc-900/30 sm:rounded-b-xl sm:border-x sm:border-b">
        <ChatWindow
          conversaId={conversaId}
          currentUserId={user.id}
          podeEnviar={podeEnviar}
          initialMensagens={mensagens ?? []}
        />
      </div>
    </div>
  );
}
