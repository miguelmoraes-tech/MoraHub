import type { ChipTone } from "@/components/status-chip";
import type { CalendarioItemTipo } from "@/lib/vencimentos/types";

export const TIPO_LABEL: Record<CalendarioItemTipo, string> = {
  vencimento: "Vencimento",
  assinatura_cliente: "Assinatura (cliente)",
  contrato: "Contrato",
  juridico: "Jurídico",
  assinatura: "Assinatura",
  propriedade_intelectual: "Propriedade Intelectual",
  ferias: "Férias",
};

export const TIPO_TONE: Record<CalendarioItemTipo, ChipTone> = {
  vencimento: "copper",
  assinatura_cliente: "sky",
  contrato: "sky",
  juridico: "sky",
  assinatura: "sky",
  propriedade_intelectual: "sky",
  ferias: "amber",
};
