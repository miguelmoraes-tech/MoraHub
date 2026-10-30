import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardHomeOverview } from "@/lib/dashboard-home/get-overview";
import { DashboardHomeBoard } from "@/components/dashboard-home/dashboard-home-board";
import { NOVA_EMPRESA } from "@/lib/empresa";
import { ACESSO_VENDEDOR_CODIGO } from "@/lib/vendedor-access";
import { tipoContaDaMetadata } from "@/lib/perfil";
import { getEmpresaAtiva } from "@/lib/empresa-ativa";

// Home do dono: só atalhos e resumos dos módulos ligados na empresa ativa. O
// Dashboard Executivo completo (getDashboardExecutivoOverview +
// DashboardExecutivoBoard) segue no repositório, sem uso, para ser religado.
export default async function DashboardHomePage() {
  // Quem manda para /vendedor/* é o proxy, pelo papel na empresa ativa; esta
  // página nunca redireciona por papel (evita ciclo com /vendedor/leads).
  const ativa = await getEmpresaAtiva();

  const overview = await getDashboardHomeOverview();

  if (!overview.temEmpresa) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Empreendedor sem empresa (o cadastro não pede o nome): dá nome a ela.
    if (user && !ativa && tipoContaDaMetadata(user) === "empresarial") redirect(NOVA_EMPRESA);

    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-col items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-300">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-zinc-100">Você ainda não tem uma empresa</p>
            <p className="text-sm text-zinc-500">Crie a sua para usar os módulos do Hub.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={NOVA_EMPRESA}
              className="rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500"
            >
              Criar minha empresa
            </Link>
            <Link
              href={ACESSO_VENDEDOR_CODIGO}
              className="rounded-lg border border-zinc-700 px-3.5 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
            >
              Entrar numa empresa com código
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <DashboardHomeBoard overview={overview} />;
}
