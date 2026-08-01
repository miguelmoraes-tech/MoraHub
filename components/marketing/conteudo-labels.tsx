import type {
  CalendarioConteudoTipo,
  CalendarioConteudoCanal,
  CalendarioConteudoStatus,
} from "@/lib/types";
import type { ChipTone } from "@/components/status-chip";

export const CONTEUDO_TIPO_LABEL: Record<CalendarioConteudoTipo, string> = {
  post: "Post",
  video: "Vídeo",
  artigo: "Artigo",
  email: "E-mail",
  stories: "Stories",
  outro: "Outro",
};

export const CONTEUDO_CANAL_LABEL: Record<CalendarioConteudoCanal, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  blog: "Blog",
  email: "E-mail",
  outro: "Outro",
};

export const CONTEUDO_STATUS_LABEL: Record<CalendarioConteudoStatus, string> = {
  planejado: "Planejado",
  em_producao: "Em produção",
  agendado: "Agendado",
  publicado: "Publicado",
  cancelado: "Cancelado",
};

export const CONTEUDO_STATUS_TONE: Record<CalendarioConteudoStatus, ChipTone> = {
  planejado: "zinc",
  em_producao: "amber",
  agendado: "sky",
  publicado: "emerald",
  cancelado: "rose",
};
