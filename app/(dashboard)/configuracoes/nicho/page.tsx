import Link from "next/link";
import { redirect } from "next/navigation";
import { getEmpresaPainel } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { getModulosHabilitados } from "@/lib/modulos/habilitados";
import { atalhosConfiguracaoNicho } from "@/lib/impressao-3d/configuracoes";
import { iconeDe } from "@/components/modulos/icones";

/**
 * Hub "Configurações do nicho": atalhos para onde cada ajuste vive. Não grava nada. Só fundador e
 * cofundador (o proxy já barra /configuracoes para a equipe; aqui confere de novo no servidor).
 */
export default async function ConfiguracoesNichoPage() {
  const empresa = await getEmpresaPainel();
  if (!empresa) redirect(HOME_DONO);
  const habilitados = await getModulosHabilitados(empresa.workspaceId);
  const atalhos = atalhosConfiguracaoNicho(habilitados);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <div>
        <Link href="/configuracoes" className="mb-2 inline-block text-xs text-zinc-500 hover:text-zinc-300">
          ← Configurações da empresa
        </Link>
        <h1 className="text-lg font-semibold text-zinc-100">Configurações do nicho</h1>
        <p className="text-sm text-zinc-500">Impressão 3D: onde ajustar preços, alertas, integrações, módulos e equipe.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {atalhos.map((a) => {
          const Icone = iconeDe(a.icone);
          return (
            <Link
              key={a.href}
              href={a.href}
              className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <Icone className="h-4 w-4 text-zinc-500" />
                {a.titulo}
              </h2>
              <p className="mt-1.5 text-xs text-zinc-500">{a.descricao}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
