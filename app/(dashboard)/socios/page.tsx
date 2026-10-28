import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEmpresaPainel } from "@/lib/empresa-ativa";
import { getModulosHabilitados, getModulosPermiteMembros } from "@/lib/modulos/habilitados";
import { HOME_DONO } from "@/lib/modulos/registry";
import {
  MODULO_ROTULO,
  extrasDoCatalogo,
  modulosOferecidos,
  paraConvites,
  paraMembros,
  paraSetores,
  type ModuloPermissivel,
} from "@/lib/socios-shared";
import { ToastProvider } from "@/components/toast";
import { SociosBoard } from "@/components/socios/socios-board";

/**
 * Equipe da empresa: sócios, funcionários e cofundadores (com permissões por
 * módulo) e setores com código de entrada. Só fundador e cofundador abrem; o
 * RLS e as RPCs são a barreira de verdade. O formulário oferece apenas módulos
 * que a empresa tem ligados e que o catálogo marca como permite_membros.
 */
export default async function SociosPage() {
  const empresa = await getEmpresaPainel();
  if (!empresa) redirect(HOME_DONO);

  const supabase = await createClient();
  const ws = empresa.workspaceId;

  const [habilitados, permiteMembros] = await Promise.all([
    getModulosHabilitados(ws),
    getModulosPermiteMembros(),
  ]);
  const chaves = modulosOferecidos(habilitados, permiteMembros);

  const [
    { data: catalogo },
    { data: membros },
    { data: convites },
    { data: setores },
    { data: codigoVendedor },
  ] = await Promise.all([
    chaves.length
      ? supabase.from("modulos").select("chave, nome, permissoes_extras").in("chave", chaves)
      : Promise.resolve({ data: [] as never[] }),
    supabase.rpc("listar_membros_empresa", { p_workspace_id: ws }),
    supabase.rpc("listar_convites_empresa", { p_workspace_id: ws }),
    supabase
      .from("perfis_acesso")
      .select("id, workspace_id, nome, descricao, permissoes, codigo, ativo")
      .eq("workspace_id", ws)
      .order("created_at", { ascending: true }),
    supabase.rpc("meu_codigo_vendedor", { p_workspace_id: ws }),
  ]);

  const porChave = new Map(
    ((catalogo ?? []) as { chave: string; nome: string; permissoes_extras: unknown }[]).map((m) => [
      m.chave,
      m,
    ])
  );
  const modulos: ModuloPermissivel[] = chaves.map((chave) => ({
    chave,
    nome: porChave.get(chave)?.nome ?? MODULO_ROTULO[chave] ?? chave,
    extras: extrasDoCatalogo(porChave.get(chave)?.permissoes_extras),
  }));

  return (
    <ToastProvider>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-zinc-100">Sócios</h1>
          <p className="text-sm text-zinc-500">
            Convide sócios, funcionários e cofundadores e escolha o que cada um vê e edita. Os
            setores dão um código para a pessoa pedir acesso sozinha.
          </p>
        </div>
        <SociosBoard
          modulos={modulos}
          membros={paraMembros(membros)}
          convites={paraConvites(convites)}
          setores={paraSetores(setores)}
          codigoVendedor={typeof codigoVendedor === "string" ? codigoVendedor : null}
          ehFundador={empresa.papel === "dono"}
          userId={empresa.userId}
        />
      </div>
    </ToastProvider>
  );
}
