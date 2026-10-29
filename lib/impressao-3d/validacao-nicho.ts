/**
 * Validação dos formulários da Etapa C-1 (alertas e integrações). Mensagens em pt-BR; os mesmos
 * limites valem no banco (CHECKs): aqui só evita a ida e dá a mensagem certa.
 */
import * as z from "zod";
import { parseNumero } from "@/lib/impressao-3d/numeros";
import { booleano } from "@/lib/impressao-3d/validacao";
import { FAIXAS_CONFIG_ALERTAS } from "@/lib/impressao-3d/alertas";
import { TIPOS_INTEGRACAO } from "@/lib/impressao-3d/integracoes";

const inteiroFaixa = (rotulo: string, min: number, max: number) =>
  z.preprocess(
    (v) => parseNumero(v),
    z
      .number({ error: `${rotulo}: informe um número inteiro.` })
      .int({ error: `${rotulo}: use um número inteiro.` })
      .gte(min, { error: `${rotulo}: use um valor de ${min} a ${max}.` })
      .lte(max, { error: `${rotulo}: use um valor de ${min} a ${max}.` })
  );

const F = FAIXAS_CONFIG_ALERTAS;

/** Config dos alertas: só os 8 campos editáveis (nada de workspace_id, updated_by...). */
export const ConfigAlertasSchema = z.object({
  estoque_baixo: booleano(),
  prazo_pedido_dias: inteiroFaixa("Prazo do pedido", F.prazo_pedido_dias.min, F.prazo_pedido_dias.max),
  manutencao: booleano(),
  pagamento_pendente_dias: inteiroFaixa("Pagamento pendente", F.pagamento_pendente_dias.min, F.pagamento_pendente_dias.max),
  orcamento_validade: booleano(),
  compra_pendente_dias: inteiroFaixa("Compra pendente", F.compra_pendente_dias.min, F.compra_pendente_dias.max),
  falhas_recorrentes_limite: inteiroFaixa("Limite de falhas", F.falhas_recorrentes_limite.min, F.falhas_recorrentes_limite.max),
  falhas_recorrentes_dias: inteiroFaixa("Janela de falhas", F.falhas_recorrentes_dias.min, F.falhas_recorrentes_dias.max),
});

/** Integração: só o tipo e se está marcada como ativa; a config é validada por tipo (integracoes.ts). */
export const IntegracaoSchema = z.object({
  tipo: z.enum(TIPOS_INTEGRACAO, { error: "Integração desconhecida." }),
  ativo: booleano(),
});
