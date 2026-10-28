import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getEmpresaAtiva, getEmpresasDoUsuario } from "@/lib/empresa-ativa";
import { EmpresaSwitcher } from "@/components/empresa/empresa-switcher";
import { NOVA_EMPRESA } from "@/lib/empresa";

/**
 * Para onde o proxy manda quem não pode usar a empresa ativa: papel sem
 * interface (financeiro, rh...) ou falha ao confirmar o acesso. É isenta da
 * resolução do proxy — por isso nunca entra em ciclo com /dashboard ou
 * /vendedor/leads — e só oferece o que sempre é seguro: trocar de empresa ou
 * criar a própria.
 */
export default async function SemAcessoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { erro } = await searchParams;
  const [empresas, ativa] = await Promise.all([getEmpresasDoUsuario(), getEmpresaAtiva()]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 text-zinc-300">
          <ShieldAlert className="h-5 w-5" />
        </span>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
          {erro ? "Não foi possível verificar seu acesso" : "Sem acesso nesta empresa"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {erro
            ? "Houve uma falha ao confirmar o seu acesso. Tente de novo em instantes."
            : "O seu vínculo com esta empresa não dá acesso a nenhuma tela. Escolha outra empresa ou crie a sua."}
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-lg shadow-black/20">
        <EmpresaSwitcher empresas={empresas} ativaId={ativa?.workspaceId ?? null} />
        <Link
          href={NOVA_EMPRESA}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-copper-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500"
        >
          <Building2 className="h-4 w-4" />
          Criar minha empresa
        </Link>
        {erro && (
          <Link
            href="/"
            className="block text-center text-xs font-medium text-zinc-400 hover:text-zinc-200"
          >
            Tentar novamente
          </Link>
        )}
      </div>

      <p className="text-center text-xs text-zinc-600">
        Conectado como <span className="text-zinc-400">{user.email}</span>
      </p>
    </div>
  );
}
