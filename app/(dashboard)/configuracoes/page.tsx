import { redirect } from "next/navigation";
import { getEmpresaPainel } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { RenomearEmpresaForm } from "@/components/empresa/renomear-empresa-form";

/** Configurações da empresa ativa. Só o dono vê (confirmado no servidor). */
export default async function ConfiguracoesPage() {
  const empresa = await getEmpresaPainel();
  if (!empresa) redirect(HOME_DONO);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Configurações da empresa</h1>
        <p className="text-sm text-zinc-500">Dados da empresa ativa.</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <RenomearEmpresaForm nomeAtual={empresa.nome ?? ""} />
      </div>
    </div>
  );
}
