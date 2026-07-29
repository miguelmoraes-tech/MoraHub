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

export type CalendarioItemTipo =
  | "vencimento"
  | "assinatura_cliente"
  | "contrato"
  | "juridico"
  | "assinatura";

export interface CalendarioItem {
  id: string;
  tipo: CalendarioItemTipo;
  titulo: string;
  data: string;
  nota: string | null;
  href: string | null;
}
