/**
 * Validação dos formulários do nicho Impressão 3D (zod). Mensagens em pt-BR;
 * números aceitam vírgula (parseNumero). As mesmas regras valem no banco
 * (CHECKs): aqui só evita a ida e dá a mensagem certa.
 */
import * as z from "zod";
import { parseNumero } from "@/lib/impressao-3d/numeros";

type Faixa = { min?: number; max?: number; maxExclusivo?: number; positivo?: boolean };

function msgFaixa(rotulo: string, f: Faixa): string {
  if (f.positivo) return `${rotulo}: informe um valor maior que zero.`;
  if (f.maxExclusivo !== undefined) return `${rotulo}: use um valor de ${f.min ?? 0} até menos de ${f.maxExclusivo}.`;
  if (f.max !== undefined) return `${rotulo}: use um valor de ${f.min ?? 0} a ${f.max}.`;
  return `${rotulo}: informe um valor maior ou igual a ${f.min ?? 0}.`;
}

function numeroBase(rotulo: string, f: Faixa) {
  let s = z.number({ error: `${rotulo}: informe um número válido.` });
  s = f.positivo
    ? s.gt(0, { error: msgFaixa(rotulo, f) })
    : s.gte(f.min ?? 0, { error: msgFaixa(rotulo, f) });
  if (f.max !== undefined) s = s.lte(f.max, { error: msgFaixa(rotulo, f) });
  if (f.maxExclusivo !== undefined) s = s.lt(f.maxExclusivo, { error: msgFaixa(rotulo, f) });
  return s;
}

/** Número opcional: vazio vira null. */
export const numOpc = (rotulo: string, f: Faixa = {}) =>
  z.preprocess((v) => parseNumero(v), numeroBase(rotulo, f).nullable());

/** Número obrigatório. */
export const numReq = (rotulo: string, f: Faixa = {}) =>
  z.preprocess((v) => parseNumero(v), numeroBase(rotulo, f));

/** Número com padrão quando vazio (ex.: 0). */
export const numPadrao = (rotulo: string, padrao: number, f: Faixa = {}) =>
  z.preprocess((v) => parseNumero(v) ?? padrao, numeroBase(rotulo, f));

/** Inteiro positivo obrigatório. */
export const inteiroPositivo = (rotulo: string) =>
  z.preprocess(
    (v) => parseNumero(v),
    z
      .number({ error: `${rotulo}: informe um número inteiro.` })
      .int({ error: `${rotulo}: use um número inteiro.` })
      .gt(0, { error: `${rotulo}: informe um valor maior que zero.` })
  );

/** Texto opcional: vazio vira null. */
export const textoOpc = (max = 500) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.string().max(max, { error: `Use no máximo ${max} caracteres.` }).nullable()
  );

export const textoReq = (rotulo: string, max = 200) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z
      .string()
      .min(1, { error: `${rotulo}: campo obrigatório.` })
      .max(max, { error: `${rotulo}: use no máximo ${max} caracteres.` })
  );

export const dataOpc = (rotulo: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: `${rotulo}: data inválida.` }).nullable()
  );

export const uuidOpc = () =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.string().uuid({ error: "Seleção inválida." }).nullable()
  );

export const booleano = () =>
  z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

/** Primeira mensagem de erro de um safeParse. */
export function primeiroErro(erro: z.ZodError): string {
  return erro.issues[0]?.message ?? "Dados inválidos.";
}

/** FormData → objeto simples (campos repetidos ficam com o último valor). */
export function formParaObjeto(formData: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData.entries());
}

// --- Schemas -------------------------------------------------------------------

export const ImpressoraSchema = z
  .object({
    nome: textoReq("Nome", 120),
    marca: textoOpc(80),
    modelo: textoOpc(80),
    tecnologia: z.enum(["fdm", "resina", "sls", "outra"], { error: "Selecione a tecnologia." }),
    volume_x_mm: numOpc("Volume X", { positivo: true }),
    volume_y_mm: numOpc("Volume Y", { positivo: true }),
    volume_z_mm: numOpc("Volume Z", { positivo: true }),
    bico_mm: numOpc("Bico", { positivo: true }),
    status: z.enum(["disponivel", "imprimindo", "manutencao", "inativa"], { error: "Selecione o status." }),
    potencia_media_kw: numPadrao("Potência média", 0),
    valor_aquisicao: numPadrao("Valor de aquisição", 0),
    valor_residual: numPadrao("Valor residual", 0),
    vida_util_horas: numPadrao("Vida útil", 0),
    data_aquisicao: dataOpc("Data de aquisição"),
    horas_uso: numPadrao("Horas de uso", 0),
    manutencao_hora: numPadrao("Manutenção por hora", 0),
    manutencao_ciclo: numPadrao("Manutenção por ciclo", 0),
    intervalo_manutencao_horas: numOpc("Intervalo de manutenção", { positivo: true }),
    horas_ultima_manutencao: numPadrao("Horas na última manutenção", 0),
    integracao_tipo: z.preprocess(
      (v) => (v === "" || v === undefined ? null : v),
      z.enum(["octoprint", "moonraker", "bambu", "prusalink", "outra"], { error: "Integração inválida." }).nullable()
    ),
    integracao_url: textoOpc(300),
    observacoes: textoOpc(1000),
  })
  .refine((d) => d.valor_residual <= d.valor_aquisicao, {
    error: "O valor residual não pode ser maior que o valor de aquisição.",
    path: ["valor_residual"],
  })
  .refine((d) => d.horas_ultima_manutencao <= d.horas_uso, {
    error: "As horas na última manutenção não podem passar das horas de uso.",
    path: ["horas_ultima_manutencao"],
  });

export const PecaDesgasteSchema = z.object({
  nome: textoReq("Nome", 120),
  categoria: z.enum(["bico", "correia", "mesa", "lubrificacao", "ventoinha", "outro"], {
    error: "Selecione a categoria.",
  }),
  custo: numReq("Custo", { min: 0 }),
  vida_util_horas: numReq("Vida útil", { positivo: true }),
  horas_ultima_troca: numPadrao("Horas na última troca", 0),
});

export const ManutencaoSchema = z.object({
  tipo: z.enum(["preventiva", "corretiva"], { error: "Selecione o tipo." }),
  descricao: textoReq("Descrição", 300),
  custo: numPadrao("Custo", 0),
  data: dataOpc("Data"),
  horas_uso_no_momento: numOpc("Horas de uso no momento", { min: 0 }),
});

const CorHex = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
  z.string().regex(/^#[0-9A-Fa-f]{6}$/, { error: "Cor: use o formato #RRGGBB." }).nullable()
);

export const MaterialSchema = z.object({
  tipo: z.enum(["filamento", "resina", "peca", "embalagem", "insumo"], { error: "Selecione o tipo." }),
  nome: textoReq("Nome", 120),
  marca: textoOpc(80),
  material: textoOpc(80),
  cor: textoOpc(60),
  cor_hex: CorHex,
  diametro_mm: numOpc("Diâmetro", { positivo: true }),
  unidade: z.enum(["g", "ml", "un"], { error: "Selecione a unidade." }),
  peso_liquido_rolo_g: numOpc("Peso líquido do rolo", { positivo: true }),
  preco_compra: numOpc("Preço de compra", { min: 0 }),
  estoque_minimo: numPadrao("Estoque mínimo", 0),
  localizacao: textoOpc(120),
  fornecedor_id: uuidOpc(),
});

export const ProdutoSchema = z.object({
  nome: textoReq("Nome", 160),
  descricao: textoOpc(2000),
  categoria: textoOpc(80),
  sku: textoOpc(60),
  impressora_id: uuidOpc(),
  material_id: uuidOpc(),
  peso_estimado_g: numOpc("Peso estimado", { min: 0 }),
  horas_estimadas: numOpc("Horas estimadas", { min: 0 }),
  preco_venda: numOpc("Preço de venda", { min: 0 }),
  publicado_loja: booleano(),
});

export const VariacaoSchema = z.object({
  nome: textoReq("Nome", 120),
  sku: textoOpc(60),
  cor: textoOpc(60),
  tamanho: textoOpc(60),
  material_id: uuidOpc(),
  peso_g: numOpc("Peso", { min: 0 }),
  horas_estimadas: numOpc("Horas estimadas", { min: 0 }),
  preco_venda: numOpc("Preço de venda", { min: 0 }),
});

export const OrcamentoSchema = z.object({
  titulo: textoReq("Título", 160),
  cliente_id: uuidOpc(),
  validade: dataOpc("Validade"),
  desconto_valor: numPadrao("Desconto", 0),
  observacoes: textoOpc(2000),
});

/** Faixas de referência para o aviso (não bloqueia o salvamento). */
export const FAIXA_DESPERDICIO = { min: 5, max: 15 };
export const FAIXA_FALHAS = { min: 5, max: 10 };

export const ConfigSchema = z.object({
  tarifa_kwh: numPadrao("Tarifa de energia", 0),
  valor_hora_mao_obra: numPadrao("Hora de mão de obra", 0),
  desperdicio_pct: numPadrao("Margem de desperdício", 8, { max: 50 }),
  falha_pct: numPadrao("Taxa de falhas", 7, { max: 50 }),
  falha_fracao_perdida: numPadrao("Fração perdida na falha", 1, { max: 1 }),
  modo_preco: z.enum(["margem", "markup"], { error: "Selecione margem ou markup." }),
  margem_pct: numPadrao("Margem", 30, { maxExclusivo: 100 }),
  markup_pct: numPadrao("Markup", 50),
  impostos_pct: numPadrao("Impostos", 0, { max: 100 }),
  taxa_pagamento_pct: numPadrao("Taxa de pagamento", 0, { max: 100 }),
  comissao_pct: numPadrao("Comissão", 0, { max: 100 }),
  taxa_fixa_pagamento: numPadrao("Taxa fixa de pagamento", 0),
  despesas_fixas_pct: numPadrao("Despesas fixas", 0),
  arredondar_para: numPadrao("Arredondar para", 0),
  preco_minimo: numPadrao("Preço mínimo", 0),
  base_custo_material: z.enum(["cadastro", "medio"], { error: "Selecione a base de custo." }),
});

/** Movimentação de estoque (entrada, ajuste, perda). */
export const MovimentoSchema = z.object({
  material_id: z.string().uuid({ error: "Material inválido." }),
  tipo: z.enum(["entrada", "ajuste", "perda"], { error: "Tipo de movimento inválido." }),
  // Ajuste aceita sinal (+/−); entrada e perda exigem positivo (conferido na action).
  quantidade: z.preprocess(
    (v) => parseNumero(v),
    z.number({ error: "Quantidade: informe um número válido." }).refine((n) => n !== 0, {
      error: "Quantidade: informe um valor diferente de zero.",
    })
  ),
  custo_total: numOpc("Custo total", { min: 0 }),
  observacao: textoOpc(300),
});
