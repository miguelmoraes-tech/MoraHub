import type { MetaOkrSetor, MetaOkrStatus, MetaOkrUnidade } from "@/lib/types";
import type { ChipTone } from "@/components/status-chip";

export const META_SETOR_LABEL: Record<MetaOkrSetor, string> = {
  geral: "Geral",
  financeiro: "Financeiro",
  comercial: "Comercial",
  marketing: "Marketing",
  rh: "RH",
  juridico: "Jurídico",
  contabil: "Contábil",
  tecnico: "Central Técnica",
};

export const META_STATUS_LABEL: Record<MetaOkrStatus, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

export const META_STATUS_TONE: Record<MetaOkrStatus, ChipTone> = {
  nao_iniciado: "zinc",
  em_andamento: "sky",
  concluido: "emerald",
  atrasado: "rose",
  cancelado: "zinc",
};

export const META_UNIDADE_LABEL: Record<MetaOkrUnidade, string> = {
  numero: "Número",
  reais: "Reais (R$)",
  percentual: "Percentual (%)",
  clientes: "Clientes",
  outro: "Outro",
};

export function formatValorUnidade(valor: number, unidade: MetaOkrUnidade): string {
  switch (unidade) {
    case "reais":
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
    case "percentual":
      return `${valor}%`;
    case "clientes":
      return `${valor} cliente${valor === 1 ? "" : "s"}`;
    default:
      return new Intl.NumberFormat("pt-BR").format(valor);
  }
}
