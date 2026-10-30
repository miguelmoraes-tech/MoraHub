"use server";

import { revalidatePath } from "next/cache";
import { getAcessoEdicao, getAcessoModulo } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { mensagemEscrita, mensagemRpc } from "@/lib/impressao-3d/erros";
import { SEM_PERMISSAO, podeVerCustos } from "@/lib/impressao-3d/regras";
import {
  avisosConclusao, avisosConclusaoMulti, lerConclusao, lerConclusaoMulti, lerFalha, lerInicio, lerPecasEstoque,
} from "@/lib/impressao-3d/regras-operacao";
import { lerLinhasTrabalho, montarConsumos, pesoTotalLinhas } from "@/lib/impressao-3d/filamentos";
import { textoPecasEntraram } from "@/lib/impressao-3d/pecas";
import { formParaObjeto, primeiroErro, textoReq } from "@/lib/impressao-3d/validacao";
import {
  ConclusaoMultiSchema, ConclusaoSchema, FalhaSchema, TrabalhoLimitadoSchema, TrabalhoSchema,
} from "@/lib/impressao-3d/validacao-operacao";
import { formatMoeda, formatNumero } from "@/lib/impressao-3d/numeros";
import type { ActionState } from "@/lib/actions/types";

const MODULO = "p3d_producao";
const ROTA = "/impressao-3d/producao";

/** Resultado de uma operação da fila: mensagem de sucesso + avisos que a pessoa precisa ler. */
export type ResultadoOperacao = { error: string } | { ok: true; mensagem: string; avisos: string[] };

function revalidarTudo() {
  revalidatePath(ROTA);
  revalidatePath("/impressao-3d/pedidos");
  revalidatePath("/impressao-3d/impressoras");
  revalidatePath("/impressao-3d/estoque");
  revalidatePath("/impressao-3d/qualidade");
}

/**
 * Trabalho avulso (produção para estoque): insert direto SÓ de descricao, quantidade, produto,
 * variação, arquivo, impressora, material, prioridade, prazo, horas e peso estimados e
 * observações. numero, status, horas_reais, peso_real_g, qualidade, iniciado_em, concluido_em,
 * consumo_registrado_em e reimpressao_de são do banco (RPCs): nunca vão no payload. Trabalhos
 * de pedido nascem de p3d_gerar_producao_do_pedido.
 */
export async function criarTrabalho(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = TrabalhoSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };
  const lista = lerLinhasTrabalho(formData.get("filamentos"));
  if (lista.erro) return { error: lista.erro };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  // Com filamentos, a lista é a fonte do material e do peso: o material único fica nulo.
  const dados = lista.linhas.length > 0
    ? { ...parsed.data, material_id: null, peso_estimado_g: pesoTotalLinhas(lista.linhas) }
    : parsed.data;

  const supabase = await createClient();
  const { data: criado, error } = await supabase
    .from("p3d_producao")
    .insert({ workspace_id: acesso.workspaceId, ...dados })
    .select("id")
    .single();
  if (error || !criado) return { error: mensagemEscrita(error, "Não foi possível criar o trabalho.") };

  if (lista.linhas.length > 0) {
    const { error: erroLinhas } = await supabase.from("p3d_producao_materiais").insert(
      lista.linhas.map((l) => ({ workspace_id: acesso.workspaceId, producao_id: criado.id, ...l }))
    );
    if (erroLinhas) {
      // Não deixa um trabalho pela metade na fila.
      await supabase.from("p3d_producao").delete().eq("id", criado.id).eq("workspace_id", acesso.workspaceId).eq("status", "fila");
      return { error: mensagemEscrita(erroLinhas, "Não foi possível salvar os filamentos do trabalho.") };
    }
  }

  revalidatePath(ROTA);
  return { ok: true };
}

/** Na fila edita tudo; depois só prioridade, prazo e observações. */
export async function atualizarTrabalho(trabalhoId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { data: atual } = await supabase
    .from("p3d_producao")
    .select("status")
    .eq("id", trabalhoId)
    .eq("workspace_id", acesso.workspaceId)
    .maybeSingle();
  if (!atual) return { error: "Trabalho não encontrado." };

  const objeto = formParaObjeto(formData);
  const esquema = atual.status === "fila" ? TrabalhoSchema : TrabalhoLimitadoSchema;
  const parsed = esquema.safeParse(objeto);
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  // Filamentos só mudam com o trabalho na fila (o banco também recusa depois).
  const editaLinhas = atual.status === "fila" && formData.has("filamentos");
  const lista = editaLinhas ? lerLinhasTrabalho(formData.get("filamentos")) : { linhas: [], erro: null };
  if (lista.erro) return { error: lista.erro };
  const dados =
    editaLinhas && lista.linhas.length > 0
      ? { ...parsed.data, material_id: null, peso_estimado_g: pesoTotalLinhas(lista.linhas) }
      : parsed.data;

  const { data, error } = await supabase
    .from("p3d_producao")
    .update(dados)
    .eq("id", trabalhoId)
    .eq("workspace_id", acesso.workspaceId)
    .select("id");
  if (error) return { error: mensagemEscrita(error, "Não foi possível atualizar o trabalho.") };
  if (!data || data.length === 0) return { error: "Trabalho não encontrado." };

  if (editaLinhas) {
    const { error: erroApagar } = await supabase
      .from("p3d_producao_materiais")
      .delete()
      .eq("producao_id", trabalhoId)
      .eq("workspace_id", acesso.workspaceId);
    if (erroApagar) return { error: mensagemEscrita(erroApagar, "Não foi possível atualizar os filamentos do trabalho.") };
    if (lista.linhas.length > 0) {
      const { error: erroLinhas } = await supabase.from("p3d_producao_materiais").insert(
        lista.linhas.map((l) => ({ workspace_id: acesso.workspaceId, producao_id: trabalhoId, ...l }))
      );
      if (erroLinhas) return { error: mensagemEscrita(erroLinhas, "Não foi possível salvar os filamentos do trabalho.") };
    }
  }

  revalidatePath(ROTA);
  return { ok: true };
}

/** Só trabalho na fila. */
export async function excluirTrabalho(trabalhoId: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { data, error } = await (await createClient())
    .from("p3d_producao")
    .delete()
    .eq("id", trabalhoId)
    .eq("workspace_id", acesso.workspaceId)
    .eq("status", "fila")
    .select("id");
  if (error) return { error: mensagemEscrita(error, "Não foi possível excluir o trabalho.") };
  if (!data || data.length === 0) return { error: "Só trabalhos na fila podem ser excluídos. Cancele ou registre falha." };

  revalidatePath(ROTA);
  return { ok: true };
}

/** Inicia o trabalho: a impressora precisa estar ativa e disponível. Mostra o aviso de estoque da RPC. */
export async function iniciarProducao(trabalhoId: string, impressoraId: string | null): Promise<ResultadoOperacao> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { data, error } = await (await createClient()).rpc("p3d_iniciar_producao", {
    p_producao_id: trabalhoId,
    ...(impressoraId ? { p_impressora_id: impressoraId } : {}),
  });
  if (error) return { error: mensagemRpc(error, "Não foi possível iniciar o trabalho.") };

  const r = lerInicio(data);
  revalidarTudo();
  return {
    ok: true,
    mensagem: r.impressora ? `Trabalho iniciado na impressora ${r.impressora}.` : "Trabalho iniciado.",
    avisos: r.aviso ? [r.aviso] : [],
  };
}

/**
 * Conclui o trabalho com o peso e as horas REAIS: a RPC baixa o material do estoque
 * (saida_producao), soma as horas de uso na impressora e a libera. Não pode ser feito duas vezes.
 */
export async function concluirProducao(trabalhoId: string, formData: FormData): Promise<ResultadoOperacao> {
  const parsed = ConclusaoSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };
  const { peso_real_g, horas_reais, material_id, observacao } = parsed.data;

  // Trabalho COM linhas de material só conclui por p3d_concluir_producao_multi (a conclusão simples é recusada).
  const supabase = await createClient();
  const { data: linhas, error: erroLinhas } = await supabase
    .from("p3d_producao_materiais")
    .select("material_id")
    .eq("producao_id", trabalhoId)
    .eq("workspace_id", acesso.workspaceId);
  if (erroLinhas) return { error: mensagemEscrita(erroLinhas, "Não foi possível ler os filamentos do trabalho.") };
  if ((linhas ?? []).length > 0) {
    return { error: "Este trabalho tem vários filamentos: conclua informando o consumo real de cada um." };
  }

  const { data, error } = await supabase.rpc("p3d_concluir_producao", {
    p_producao_id: trabalhoId,
    p_peso_real_g: peso_real_g,
    p_horas_reais: horas_reais,
    ...(material_id ? { p_material_id: material_id } : {}),
    ...(observacao ? { p_observacao: observacao } : {}),
  });
  if (error) return { error: mensagemRpc(error, "Não foi possível concluir o trabalho.") };

  const r = lerConclusao(data);
  const avisos = avisosConclusao(r, (n) => formatNumero(n, 1));
  // Trabalho avulso com produto: as peças entram sozinhas no estoque de peças.
  if (lerPecasEstoque(data)) {
    const { data: t } = await supabase
      .from("p3d_producao")
      .select("quantidade")
      .eq("id", trabalhoId)
      .eq("workspace_id", acesso.workspaceId)
      .maybeSingle();
    if (t) avisos.push(textoPecasEntraram(t.quantidade));
  }
  revalidarTudo();
  return {
    ok: true,
    mensagem: "Trabalho concluído. O consumo de material foi baixado do estoque.",
    avisos,
  };
}

/**
 * Conclui um trabalho com VÁRIOS filamentos (p3d_concluir_producao_multi): exige o consumo real de TODOS
 * os materiais do trabalho. Baixa cada filamento do estoque, soma as horas na impressora e, em trabalho
 * avulso com produto, dá entrada das peças no estoque de peças.
 */
export async function concluirProducaoMulti(trabalhoId: string, formData: FormData): Promise<ResultadoOperacao> {
  const horas = ConclusaoMultiSchema.safeParse(formParaObjeto(formData));
  if (!horas.success) return { error: primeiroErro(horas.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  let bruto: unknown;
  try {
    bruto = JSON.parse(String(formData.get("consumos") ?? "[]"));
  } catch {
    return { error: "Consumos: lista inválida." };
  }
  const linhasForm = (Array.isArray(bruto) ? bruto : []).map((x) => {
    const o = x && typeof x === "object" ? (x as Record<string, unknown>) : {};
    return { material_id: String(o.material_id ?? ""), peso_real_g: String(o.peso_real_g ?? "") };
  });

  // Os materiais do trabalho vêm do banco, nunca do formulário.
  const supabase = await createClient();
  const { data: doTrabalho, error: erroLeitura } = await supabase
    .from("p3d_producao_materiais")
    .select("material_id")
    .eq("producao_id", trabalhoId)
    .eq("workspace_id", acesso.workspaceId);
  if (erroLeitura) return { error: mensagemEscrita(erroLeitura, "Não foi possível ler os filamentos do trabalho.") };
  const ids = (doTrabalho ?? []).map((l) => l.material_id);
  if (ids.length === 0) return { error: "Este trabalho não tem filamentos: use a conclusão simples." };

  const montado = montarConsumos(linhasForm, ids);
  if (montado.erros.length > 0) return { error: montado.erros[0] };

  const { data, error } = await supabase.rpc("p3d_concluir_producao_multi", {
    p_producao_id: trabalhoId,
    p_horas_reais: horas.data.horas_reais,
    p_consumos: montado.consumos as never,
    ...(horas.data.observacao ? { p_observacao: horas.data.observacao } : {}),
  });
  if (error) return { error: mensagemRpc(error, "Não foi possível concluir o trabalho.") };

  const r = lerConclusaoMulti(data);
  let quantidade = 0;
  if (r.pecas_estoque) {
    const { data: t } = await supabase
      .from("p3d_producao")
      .select("quantidade")
      .eq("id", trabalhoId)
      .eq("workspace_id", acesso.workspaceId)
      .maybeSingle();
    quantidade = t?.quantidade ?? 0;
  }
  revalidarTudo();
  return {
    ok: true,
    mensagem: "Trabalho concluído. O consumo de cada filamento foi baixado do estoque.",
    avisos: avisosConclusaoMulti(r, quantidade, (n) => formatNumero(n, 1)),
  };
}

/** Só na fila. Cancelar exige motivo. */
export async function cancelarProducao(trabalhoId: string, motivo: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };
  const m = textoReq("Motivo", 300).safeParse(motivo);
  if (!m.success) return { error: "Informe o motivo do cancelamento." };

  const { error } = await (await createClient()).rpc("p3d_cancelar_producao", {
    p_producao_id: trabalhoId,
    p_motivo: m.data,
  });
  if (error) return { error: mensagemRpc(error, "Não foi possível cancelar o trabalho.") };

  revalidarTudo();
  return { ok: true };
}

/**
 * Registra uma falha (p3d_registrar_falha). Em trabalho imprimindo baixa o material perdido e o
 * trabalho vira "falhou". Em trabalho já concluído NÃO baixa estoque de novo (o consumo já foi
 * baixado na conclusão); quantidade afetada menor que a do trabalho mantém o trabalho concluído
 * (falha parcial). Reimprimir cria um novo trabalho na fila. Exige edição em Produção OU Qualidade.
 */
export async function registrarFalhaProducao(trabalhoId: string, formData: FormData): Promise<ResultadoOperacao> {
  const parsed = FalhaSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = (await getAcessoEdicao(MODULO)) ?? (await getAcessoEdicao("p3d_qualidade"));
  if (!acesso) return { error: SEM_PERMISSAO };
  const d = parsed.data;

  const { data, error } = await (await createClient()).rpc("p3d_registrar_falha", {
    p_producao_id: trabalhoId,
    p_tipo_defeito: d.tipo_defeito,
    p_peso_perdido_g: d.peso_perdido_g,
    p_horas_perdidas: d.horas_perdidas,
    p_reimprimir: d.reimprimir,
    ...(d.descricao ? { p_descricao: d.descricao } : {}),
    ...(d.quantidade_afetada !== null ? { p_quantidade_afetada: d.quantidade_afetada } : {}),
  });
  if (error) return { error: mensagemRpc(error, "Não foi possível registrar a falha.") };

  const r = lerFalha(data);
  // Custo da falha é do extra "custos" de Qualidade: sem ele a mensagem leva só quantidades.
  const verCustos = podeVerCustos(await getAcessoModulo("p3d_qualidade"));
  const avisos: string[] = [];
  if (r.estoque_negativo) avisos.push("O estoque do material ficou NEGATIVO após a baixa da falha.");
  avisos.push(
    r.baixou_estoque
      ? `Material perdido baixado do estoque (${formatNumero(d.peso_perdido_g, 1)} g).${verCustos ? ` Custo do material: ${formatMoeda(r.custo_material)}; custo de máquina estimado: ${formatMoeda(r.custo_maquina_estimado)}.` : ""}`
      : `Estoque NÃO foi baixado de novo: o material deste trabalho já saiu do estoque na conclusão.${verCustos ? ` Custo de máquina estimado: ${formatMoeda(r.custo_maquina_estimado)}.` : ""}`
  );
  if (r.reimpressao_id) avisos.push("Uma reimpressão foi criada na fila de produção.");
  revalidarTudo();
  return { ok: true, mensagem: "Falha registrada.", avisos };
}
