import { Home, Gavel, Calculator, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { HUB_MODE_COOKIE, MODE_HOME_ROUTE, accountTypeHubMode, type AccountType, type HubMode } from "@/lib/hub-mode";
import { filtrarContasPorPapel, getContasVinculadas, nomeConta } from "@/lib/colaborador";
import type { ColaboradorPapel } from "@/lib/types";

const WORKSPACE_META: Record<
  ColaboradorPapel,
  { label: string; description: string; icon: typeof Gavel; iconBg: string; text: string }
> = {
  advogado: {
    label: "Workspace do Advogado",
    description: "Pendências jurídicas, processos, assinaturas e solicitações",
    icon: Gavel,
    iconBg: "bg-violet-500/20 text-violet-300",
    text: "text-violet-200",
  },
  contador: {
    label: "Workspace do Contador",
    description: "Pendências contábeis/fiscais, fechamentos mensais e financeiro",
    icon: Calculator,
    iconBg: "bg-sky-500/20 text-sky-300",
    text: "text-sky-200",
  },
};

export default async function ColaboradorPickerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tiposAtivosRows } = await supabase
    .from("perfis_tipos_ativos")
    .select("tipo")
    .eq("user_id", user?.id ?? "");
  const tiposAtivos = (tiposAtivosRows ?? []).map((r) => r.tipo as AccountType);

  // A user may have activated Business, Pessoal, both, or neither — whichever
  // matches the last mode they browsed (cookie) wins; otherwise the first one
  // they've activated. "Minha conta" only shows if they own at least one.
  const ownModes = Array.from(
    new Set(tiposAtivos.map(accountTypeHubMode).filter((m): m is HubMode => m !== null))
  );
  const cookieStore = await cookies();
  const cookieMode = cookieStore.get(HUB_MODE_COOKIE)?.value;
  const meuModo: HubMode | null =
    (cookieMode === "business" || cookieMode === "pessoal") && ownModes.includes(cookieMode)
      ? cookieMode
      : (ownModes[0] ?? null);

  const contas = await getContasVinculadas();
  const workspaces = (["advogado", "contador"] as const)
    .map((papel) => ({ papel, contas: filtrarContasPorPapel(contas, papel) }))
    .filter((w) => w.contas.length > 0);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-1 text-lg font-semibold text-zinc-100">
        Contas vinculadas
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        {meuModo
          ? "Sua conta e os workspaces em que você colabora."
          : "Os workspaces em que você colabora."}
      </p>

      <div className="space-y-2">
        {meuModo && (
          <Link
            href={MODE_HOME_ROUTE[meuModo]}
            className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5 transition-colors hover:bg-zinc-900"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-300">
              <Home className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-zinc-100">
                Minha conta
              </span>
              <span className="block truncate text-xs text-zinc-500">
                {user?.email}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600" />
          </Link>
        )}

        {workspaces.map(({ papel, contas: contasDoPapel }) => {
          const meta = WORKSPACE_META[papel];
          const Icon = meta.icon;
          const nomes = contasDoPapel.map(nomeConta).join(", ");
          return (
            <Link
              key={papel}
              href={`/colaborador/${papel}`}
              className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5 transition-colors hover:bg-zinc-900"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.iconBg}`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-medium ${meta.text}`}>
                  {meta.label}
                </span>
                <span className="block truncate text-xs text-zinc-500">
                  {contasDoPapel.length} conta{contasDoPapel.length === 1 ? "" : "s"}{" "}
                  vinculada{contasDoPapel.length === 1 ? "" : "s"} · {nomes}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600" />
            </Link>
          );
        })}
      </div>

      {contas.length === 0 && (
        <p className="mt-4 text-xs text-zinc-600">
          Você ainda não está vinculado a nenhuma conta — peça para seu
          cliente te convidar pelo e-mail que você cadastrou aqui:{" "}
          <span className="font-medium text-zinc-400">{user?.email}</span>.
        </p>
      )}
    </div>
  );
}
