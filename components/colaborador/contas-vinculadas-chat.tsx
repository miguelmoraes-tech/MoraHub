import { Users2 } from "lucide-react";
import type { ContaVinculada } from "@/lib/types";
import { nomeConta } from "@/lib/colaborador-shared";
import { ChatLink } from "@/components/chat/chat-link";

export function ContasVinculadasChat({
  contas,
  papel,
  conversaByDono,
  unreadByConversa,
  currentUserId,
}: {
  contas: ContaVinculada[];
  papel: "advogado" | "contador";
  conversaByDono: Map<string, string>;
  unreadByConversa: Map<string, number>;
  currentUserId: string;
}) {
  return (
    <div className="mx-auto max-w-4xl px-6 pb-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Users2 className="h-4 w-4 text-zinc-500" />
          Contas vinculadas
        </div>

        {contas.length > 0 ? (
          <div className="space-y-2">
            {contas.map((conta) => {
              const conversaId = conversaByDono.get(conta.dono_id);
              return (
                <div
                  key={conta.dono_id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-200">
                      {nomeConta(conta)}
                    </p>
                    {conta.dono_nome && conta.dono_email && (
                      <p className="truncate text-xs text-zinc-500">
                        {conta.dono_email}
                      </p>
                    )}
                  </div>
                  {conversaId && (
                    <ChatLink
                      href={`/colaborador/${papel}/chat/${conversaId}`}
                      conversaId={conversaId}
                      currentUserId={currentUserId}
                      initialUnread={unreadByConversa.get(conversaId) ?? 0}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Nenhuma conta vinculada.</p>
        )}
      </div>
    </div>
  );
}
