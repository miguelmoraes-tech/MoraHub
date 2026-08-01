import type { CampanhaCanal, CampanhaStatus } from "@/lib/types";
import type { ChipTone } from "@/components/status-chip";

export const CAMPANHA_CANAL_LABEL: Record<CampanhaCanal, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  linkedin_ads: "LinkedIn Ads",
  tiktok_ads: "TikTok Ads",
  organico: "Orgânico",
  outro: "Outro",
};

export const CAMPANHA_STATUS_LABEL: Record<CampanhaStatus, string> = {
  planejada: "Planejada",
  ativa: "Ativa",
  pausada: "Pausada",
  encerrada: "Encerrada",
};

export const CAMPANHA_STATUS_TONE: Record<CampanhaStatus, ChipTone> = {
  planejada: "zinc",
  ativa: "emerald",
  pausada: "amber",
  encerrada: "zinc",
};
