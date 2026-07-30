import { Building2, Home, ArrowRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MODE_HOME_ROUTE, accountTypeToHubMode } from "@/lib/hub-mode";
import { entrarContaVinculada } from "@/app/colaborador/actions";
import type { ColaboradorPapel, ContaVinculada } from "@/lib/types";

const PAPEL_LABEL: Record<ColaboradorPapel, string> = {
  contador: "Contador",
  advogado: "Advogado",
};

export default async function ColaboradorPickerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfis")
    .select("tipo_conta_padrao")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  const meuModo = accountTypeToHubMode(perfil?.tipo_conta_padrao);

  const { data: contas } = (await supabase.rpc("get_contas_vinculadas")) as {
    data: ContaVinculada[] | null;
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-1 text-lg font-semibold text-zinc-100">
        Escolha onde entrar
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        Sua conta e as contas em que você colabora.
      </p>

      <div className="space-y-2">
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

        {(contas ?? []).map((conta) => (
          <form
            key={conta.dono_id}
            action={entrarContaVinculada.bind(null, conta.dono_id)}
          >
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5 text-left transition-colors hover:bg-zinc-900"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-copper-500/20 text-copper-300">
                <Building2 className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-zinc-100">
                  {conta.dono_nome || conta.dono_email}
                </span>
                <span className="block text-xs text-zinc-500">
                  Você colabora como {PAPEL_LABEL[conta.papel] ?? conta.papel}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600" />
            </button>
          </form>
        ))}
      </div>

      {(contas ?? []).length === 0 && (
        <p className="mt-4 text-xs text-zinc-600">
          Você ainda não colabora em nenhuma conta.
        </p>
      )}
    </div>
  );
}
