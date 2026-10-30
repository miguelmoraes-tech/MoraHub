/**
 * Validação dos formulários da Etapa B (zod, mensagens em pt-BR; números aceitam
 * vírgula). As mesmas regras valem no banco: aqui só evita a ida e dá a mensagem certa.
 * Nenhum schema aceita campo protegido (status, numero, subtotal, total, custo_total,
 * lucro_total, pago_valor, cancelado_*, recebida_em, conta_pagar_id, horas_reais,
 * peso_real_g, qualidade, iniciado_em, concluido_em, postado_em, entregue_em...).
 */
import * as z from "zod";
import {
  booleano, dataOpc, inteiroPositivo, numOpc, numPadrao, numReq, textoOpc, textoReq, uuidOpc,
} from "@/lib/impressao-3d/validacao";
import { parseNumero } from "@/lib/impressao-3d/numeros";
import { TIPOS_DEFEITO } from "@/lib/impressao-3d/tipos-operacao";

const uuidReq = (rotulo: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z.string().min(1, { error: `${rotulo}: selecione uma opção.` }).uuid({ error: `${rotulo}: seleção inválida.` })
  );

/** Só http(s): o endereço vira link na tela, então nada de javascript: ou data:. */
const urlOpc = (rotulo: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z
      .string()
      .max(500, { error: `${rotulo}: use no máximo 500 caracteres.` })
      .regex(/^https?:\/\/\S+$/i, { error: `${rotulo}: informe um endereço começando com http:// ou https://.` })
      .nullable()
  );

const emailOpc = () =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z
      .string()
      .max(160, { error: "E-mail: use no máximo 160 caracteres." })
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { error: "E-mail: formato inválido." })
      .nullable()
  );

const PRIORIDADES = ["baixa", "normal", "alta", "urgente"] as const;
const prioridade = () => z.enum(PRIORIDADES, { error: "Selecione a prioridade." });

// --- Fornecedores e compras --------------------------------------------------------

export const FornecedorSchema = z.object({
  nome: textoReq("Nome", 160),
  contato: textoOpc(120),
  telefone: textoOpc(40),
  email: emailOpc(),
  site: urlOpc("Site"),
  categoria: textoOpc(80),
  observacoes: textoOpc(1000),
});

export const CompraSchema = z.object({
  fornecedor_id: uuidReq("Fornecedor"),
  data: dataOpc("Data"),
  validade_cotacao: dataOpc("Validade da cotação"),
  prazo_entrega: dataOpc("Prazo de entrega"),
  frete: numPadrao("Frete", 0, { min: 0 }),
  desconto: numPadrao("Desconto", 0, { min: 0 }),
  observacoes: textoOpc(1000),
});

export const CompraItemSchema = z.object({
  material_id: uuidReq("Material"),
  // SEMPRE na unidade base do material (g, ml ou un).
  quantidade: numReq("Quantidade", { positivo: true }),
  preco_total: numReq("Valor pago pelo item", { min: 0 }),
  observacao: textoOpc(300),
});

export const RecebimentoSchema = z
  .object({
    gerar_conta_pagar: booleano(),
    vencimento: dataOpc("Vencimento"),
  })
  .refine((d) => !d.gerar_conta_pagar || !!d.vencimento, {
    error: "Informe o vencimento para gerar a conta a pagar.",
    path: ["vencimento"],
  });

// --- Pedidos ------------------------------------------------------------------------------

export const PedidoSchema = z
  .object({
    cliente_id: uuidOpc(),
    cliente_avulso: textoOpc(160),
    prioridade: prioridade(),
    data_pedido: dataOpc("Data do pedido"),
    prazo_entrega: dataOpc("Prazo de entrega"),
    desconto_valor: numPadrao("Desconto", 0, { min: 0 }),
    frete_valor: numPadrao("Frete", 0, { min: 0 }),
    observacoes: textoOpc(2000),
  })
  .refine((d) => !!d.cliente_id || !!d.cliente_avulso, {
    error: "Informe o cliente: escolha um cadastrado ou digite o nome do cliente avulso.",
    path: ["cliente_avulso"],
  });

/** Depois de iniciada a produção só mudam prioridade, prazo e observações. */
export const PedidoLimitadoSchema = z.object({
  prioridade: prioridade(),
  prazo_entrega: dataOpc("Prazo de entrega"),
  observacoes: textoOpc(2000),
});

export const ConversaoPedidoSchema = z.object({
  prazo: dataOpc("Prazo de entrega"),
  prioridade: prioridade(),
});

export const PedidoItemSchema = z.object({
  descricao: textoReq("Descrição", 200),
  produto_id: uuidOpc(),
  variacao_id: uuidOpc(),
  quantidade: inteiroPositivo("Quantidade"),
  preco_unitario: numReq("Preço unitário", { min: 0 }),
  custo_unitario: numOpc("Custo unitário", { min: 0 }),
});

export const PagamentoSchema = z.object({
  tipo: z.enum(["pagamento", "estorno"], { error: "Selecione pagamento ou estorno." }),
  valor: numReq("Valor", { positivo: true }),
  forma: z.enum(["pix", "cartao", "boleto", "dinheiro", "transferencia", "outro"], { error: "Selecione a forma." }),
  data: dataOpc("Data"),
  observacao: textoOpc(300),
  lancar_financeiro: booleano(),
});

// --- Produção -------------------------------------------------------------------------------

export const TrabalhoSchema = z.object({
  descricao: textoReq("Descrição", 200),
  quantidade: inteiroPositivo("Quantidade"),
  produto_id: uuidOpc(),
  variacao_id: uuidOpc(),
  arquivo_id: uuidOpc(),
  impressora_id: uuidOpc(),
  material_id: uuidOpc(),
  prioridade: prioridade(),
  prazo: dataOpc("Prazo"),
  horas_estimadas: numOpc("Horas estimadas", { min: 0 }),
  peso_estimado_g: numOpc("Peso estimado", { min: 0 }),
  observacoes: textoOpc(1000),
});

/** Depois da fila só mudam prioridade, prazo e observações. */
export const TrabalhoLimitadoSchema = z.object({
  prioridade: prioridade(),
  prazo: dataOpc("Prazo"),
  observacoes: textoOpc(1000),
});

export const ConclusaoSchema = z.object({
  peso_real_g: numReq("Peso real", { min: 0 }),
  horas_reais: numReq("Horas reais", { min: 0 }),
  material_id: uuidOpc(),
  observacao: textoOpc(300),
});

/** Conclusão com vários filamentos: horas e observação (o consumo de cada filamento vai à parte, como lista). */
export const ConclusaoMultiSchema = z.object({
  horas_reais: numReq("Horas reais", { min: 0 }),
  observacao: textoOpc(300),
});

export const FalhaSchema = z.object({
  tipo_defeito: z.enum(TIPOS_DEFEITO, { error: "Selecione o tipo de defeito." }),
  peso_perdido_g: numReq("Peso perdido", { min: 0 }),
  horas_perdidas: numReq("Horas perdidas", { min: 0 }),
  descricao: textoOpc(500),
  reimprimir: booleano(),
  quantidade_afetada: z.preprocess(
    (v) => parseNumero(v),
    z
      .number({ error: "Quantidade afetada: informe um número inteiro." })
      .int({ error: "Quantidade afetada: use um número inteiro." })
      .gt(0, { error: "Quantidade afetada: informe um valor maior que zero." })
      .nullable()
  ),
});

// --- Qualidade ------------------------------------------------------------------------------------

export const InspecaoSchema = z
  .object({
    resultado: z.enum(["aprovado", "reprovado", "retrabalho"], { error: "Selecione o resultado." }),
    defeitos: z.array(z.enum(TIPOS_DEFEITO, { error: "Defeito inválido." })),
    observacoes: textoOpc(500),
    acao: z.enum(["manter", "reimprimir"], { error: "Selecione a ação." }),
  })
  .refine((d) => d.resultado !== "reprovado" || d.defeitos.length > 0, {
    error: "Reprovado exige pelo menos um defeito.",
    path: ["defeitos"],
  });

// --- Expedição -----------------------------------------------------------------------------------------

export const EnvioSchema = z.object({
  pedido_id: uuidReq("Pedido"),
  transportadora: textoOpc(120),
  servico: textoOpc(120),
  codigo_rastreio: textoOpc(80),
  url_rastreio: urlOpc("Link de rastreio"),
  custo_frete: numPadrao("Custo do frete", 0, { min: 0 }),
  peso_kg: numOpc("Peso", { positivo: true }),
  volumes: inteiroPositivo("Volumes"),
  previsao_entrega: dataOpc("Previsão de entrega"),
  observacoes: textoOpc(500),
});

export const StatusEnvioSchema = z.object({
  data: dataOpc("Data"),
  recebedor: textoOpc(120),
});
