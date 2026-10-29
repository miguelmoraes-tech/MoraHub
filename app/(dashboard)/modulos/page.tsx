import { redirect } from "next/navigation";
import { getWorkspaceIdAtivo } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { HOME_DONO } from "@/lib/modulos/registry";
import { ModulosBoard, type ModuloCatalogo } from "@/components/modulos/modulos-board";
import { getConfigEmpresa } from "@/lib/rotulos";
import { criarRotulos } from "@/lib/rotulos-shared";
import { FRASE_MODULO } from "@/lib/impressao-3d/frases-modulos";

/** Catálogo de módulos da empresa. Só o dono vê e altera. */
export default async function ModulosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // A empresa é a do próprio usuário; a RPC ainda confere no banco que ele é
  // o dono — quem não é cai de volta no início.
  const workspaceId = await getWorkspaceIdAtivo();
  if (!workspaceId) redirect(HOME_DONO);
  const { data: ehDono } = await supabase.rpc("eh_dono_workspace", { p_ws: workspaceId });
  if (ehDono !== true) redirect(HOME_DONO);

  // Nicho da empresa (se houver): marca os módulos recomendados que faltam ligar.
  const config = await getConfigEmpresa();
  const rotulos = criarRotulos(config.mapa);

  const [{ data: catalogo }, { data: ligados }, nichoInfo, recomendadosDb] = await Promise.all([
    supabase.from("modulos").select("*").order("ordem"),
    supabase
      .from("workspace_modulos")
      .select("modulo_chave")
      .eq("workspace_id", workspaceId)
      .eq("habilitado", true),
    config.nichoChave
      ? supabase.from("nichos").select("nome").eq("chave", config.nichoChave).maybeSingle()
      : Promise.resolve({ data: null }),
    config.nichoChave
      ? supabase
          .from("nicho_modulos")
          .select("modulo_chave")
          .eq("nicho_chave", config.nichoChave)
          .eq("recomendado", true)
      : Promise.resolve({ data: [] }),
  ]);
  const recomendados = new Set(
    ((recomendadosDb.data ?? []) as { modulo_chave: string }[]).map((r) => r.modulo_chave)
  );

  const modulos: ModuloCatalogo[] = (catalogo ?? []).map((m) => ({
    chave: m.chave,
    // Rótulo da empresa (nicho/modelo) tem preferência sobre o nome do catálogo.
    nome: rotulos.personalizado(m.chave) ? rotulos.plural(m.chave) : m.nome,
    recomendado: recomendados.has(m.chave),
    descricao: m.descricao,
    frase: FRASE_MODULO[m.chave] ?? null,
    icone: m.icone,
    categoria: m.categoria,
    ativo: m.ativo,
    dependeDe: m.depende_de ?? [],
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Módulos</h1>
        <p className="text-sm text-zinc-500">
          Escolha o que a sua empresa usa. Remover um módulo só o esconde: nenhum dado é apagado.
        </p>
      </div>

      <ModulosBoard
        modulos={modulos}
        habilitados={(ligados ?? []).map((l) => l.modulo_chave)}
        nichoNome={(nichoInfo.data as { nome: string } | null)?.nome ?? null}
      />
    </div>
  );
}
