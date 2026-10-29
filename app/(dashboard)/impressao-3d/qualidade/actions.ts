"use server";

import { revalidatePath } from "next/cache";
import { getAcessoEdicao } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { mensagemRpc } from "@/lib/impressao-3d/erros";
import { SEM_PERMISSAO } from "@/lib/impressao-3d/regras";
import { formParaObjeto, primeiroErro } from "@/lib/impressao-3d/validacao";
import { InspecaoSchema } from "@/lib/impressao-3d/validacao-operacao";
import type { ResultadoOperacao } from "@/app/(dashboard)/impressao-3d/producao/actions";

const MODULO = "p3d_qualidade";
const ROTA = "/impressao-3d/qualidade";

/**
 * Registra a inspeção de um trabalho concluído (p3d_registrar_inspecao). Reprovado exige pelo
 * menos um defeito; reprovado + "reimprimir" dispara a falha e a reimpressão (a RPC decide). As
 * inspeções e as falhas são somente leitura: só esta RPC escreve.
 */
export async function registrarInspecao(producaoId: string, formData: FormData): Promise<ResultadoOperacao> {
  const bruto = { ...formParaObjeto(formData), defeitos: formData.getAll("defeitos") };
  const parsed = InspecaoSchema.safeParse(bruto);
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };
  const { resultado, defeitos, observacoes, acao } = parsed.data;

  const { data, error } = await (await createClient()).rpc("p3d_registrar_inspecao", {
    p_producao_id: producaoId,
    p_resultado: resultado,
    p_defeitos: defeitos,
    p_acao: resultado === "reprovado" ? acao : "manter",
    ...(observacoes ? { p_observacoes: observacoes } : {}),
  });
  if (error) return { error: mensagemRpc(error, "Não foi possível registrar a inspeção.") };

  const r = (data && typeof data === "object" && !Array.isArray(data) ? data : {}) as Record<string, unknown>;
  const avisos: string[] = [];
  if (resultado === "reprovado" && acao === "reimprimir") {
    avisos.push("Reprovado com reimpressão: a falha foi registrada e uma reimpressão foi criada na fila de produção.");
  }
  if (resultado === "reprovado") {
    avisos.push("Trabalho reprovado: o pedido não pode ser marcado como pronto enquanto houver trabalho reprovado.");
  }
  revalidatePath(ROTA);
  revalidatePath("/impressao-3d/producao");
  revalidatePath("/impressao-3d/pedidos");
  return {
    ok: true,
    mensagem: `Inspeção registrada${typeof r.qualidade === "string" ? ` (qualidade: ${r.qualidade})` : ""}.`,
    avisos,
  };
}
