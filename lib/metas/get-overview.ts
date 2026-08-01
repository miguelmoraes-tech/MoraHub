import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/vencimentos/dates";
import { agruparObjetivos } from "@/lib/metas/grouping";
import type { MetaOkr, MetaOkrSetor } from "@/lib/types";

export interface MetasOverview {
  emAndamentoCount: number;
  progressoMedio: number | null;
  atrasadosCount: number;
}

const VAZIO: MetasOverview = { emAndamentoCount: 0, progressoMedio: null, atrasadosCount: 0 };

export async function getMetasOverview(donoId: string | null): Promise<MetasOverview> {
  if (!donoId) return VAZIO;

  const supabase = await createClient();
  const { data: itens } = (await supabase
    .from("metas_okr")
    .select("*")
    .eq("user_id", donoId)) as { data: MetaOkr[] | null };

  const agrupados = agruparObjetivos(itens ?? [], todayISO()).filter(
    (a) => a.objetivo.status !== "cancelado"
  );

  const progressos = agrupados
    .map((a) => a.progressoMedio)
    .filter((p): p is number => p !== null);

  return {
    emAndamentoCount: agrupados.filter((a) => a.objetivo.status === "em_andamento").length,
    progressoMedio:
      progressos.length > 0 ? progressos.reduce((a, b) => a + b, 0) / progressos.length : null,
    atrasadosCount: agrupados.filter((a) => a.atrasado).length,
  };
}

/**
 * Resultado-Chave mais relevante de um setor para o período atual (usado
 * pelo card "meta do mês" do Comercial no Dashboard Executivo): o de prazo
 * mais próximo entre os ainda válidos (período não encerrado, não
 * cancelado). Se várias metas do setor estiverem ativas ao mesmo tempo,
 * mostrar só uma evita um card lotado — a mais urgente é a mais útil.
 */
export interface MetaSetorResumo {
  titulo: string;
  progresso: number;
}

export async function getMetaResumoPorSetor(
  donoId: string | null,
  setor: MetaOkrSetor
): Promise<MetaSetorResumo | null> {
  if (!donoId) return null;

  const supabase = await createClient();
  const hoje = todayISO();
  const { data: resultados } = (await supabase
    .from("metas_okr")
    .select("*")
    .eq("user_id", donoId)
    .eq("tipo", "resultado_chave")
    .eq("setor", setor)
    .neq("status", "cancelado")
    .order("periodo_fim", { ascending: true, nullsFirst: false })) as { data: MetaOkr[] | null };

  const valido = (resultados ?? []).find((r) => !r.periodo_fim || r.periodo_fim >= hoje);
  if (!valido || !valido.valor_meta || valido.valor_meta <= 0) return null;

  return {
    titulo: valido.titulo,
    progresso: Math.min(100, Math.max(0, (valido.valor_atual / valido.valor_meta) * 100)),
  };
}
