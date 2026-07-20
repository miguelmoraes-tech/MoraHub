export type VencimentoTipo =
  | "assinatura"
  | "gasto_fixo"
  | "vencimento"
  | "contrato"
  | "juridico";

export interface VencimentoAlerta {
  id: string;
  tipo: VencimentoTipo;
  data: string;
  diasRestantes: number;
  mensagem: string;
}
