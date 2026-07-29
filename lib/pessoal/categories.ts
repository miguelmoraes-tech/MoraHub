import {
  Landmark,
  PiggyBank,
  CreditCard,
  Wallet,
  TrendingUp,
  CircleDollarSign,
  Video,
  BookOpen,
  Newspaper,
  Link2,
  Shapes,
  type LucideIcon,
} from "lucide-react";
import type {
  PessoalAccountType,
  PessoalCategoryKind,
  PessoalDocumentCategory,
  PessoalInvestmentType,
  PessoalLibraryItemStatus,
  PessoalLibraryItemType,
  PessoalProjectStatus,
  PessoalTaskPriority,
  PessoalTaskStatus,
} from "@/lib/pessoal/types";

export const ACCOUNT_TYPES: {
  value: PessoalAccountType;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "corrente", label: "Conta corrente", icon: Landmark },
  { value: "poupanca", label: "Poupança", icon: PiggyBank },
  { value: "cartao", label: "Cartão", icon: CreditCard },
  { value: "carteira", label: "Carteira", icon: Wallet },
  { value: "investimento", label: "Investimento", icon: TrendingUp },
  { value: "outro", label: "Outro", icon: CircleDollarSign },
];

export const TRANSACTION_TYPES: { value: PessoalCategoryKind; label: string }[] =
  [
    { value: "receita", label: "Receita" },
    { value: "despesa", label: "Despesa" },
  ];

export const TRANSACTION_CHART_COLORS: Record<PessoalCategoryKind, string> = {
  receita: "#008300",
  despesa: "#e66767",
};

export const CATEGORY_COLOR_PALETTE = [
  "#3b82f6", // azul
  "#f97316", // laranja
  "#14b8a6", // água
  "#eab308", // amarelo
  "#d946ef", // magenta
  "#22c55e", // verde
  "#8b5cf6", // violeta
  "#ef4444", // vermelho
];

export const DEFAULT_CATEGORIES: {
  name: string;
  kind: PessoalCategoryKind;
  color: string;
}[] = [
  { name: "Mercado", kind: "despesa", color: CATEGORY_COLOR_PALETTE[0] },
  { name: "Assinaturas", kind: "despesa", color: CATEGORY_COLOR_PALETTE[1] },
  { name: "Cliente", kind: "receita", color: CATEGORY_COLOR_PALETTE[2] },
  { name: "Moradia", kind: "despesa", color: CATEGORY_COLOR_PALETTE[3] },
  { name: "Transporte", kind: "despesa", color: CATEGORY_COLOR_PALETTE[4] },
  { name: "Saúde", kind: "despesa", color: CATEGORY_COLOR_PALETTE[5] },
  { name: "Lazer", kind: "despesa", color: CATEGORY_COLOR_PALETTE[6] },
  {
    name: "Salário/Recebimento",
    kind: "receita",
    color: CATEGORY_COLOR_PALETTE[7],
  },
];

export const INVESTMENT_TYPES: { value: PessoalInvestmentType; label: string }[] =
  [
    { value: "renda_fixa", label: "Renda fixa" },
    { value: "tesouro_direto", label: "Tesouro direto" },
    { value: "acoes", label: "Ações" },
    { value: "fundos", label: "Fundos" },
    { value: "cripto", label: "Cripto" },
    { value: "previdencia", label: "Previdência" },
    { value: "outro", label: "Outro" },
  ];

export const DOCUMENT_CATEGORIES: {
  value: PessoalDocumentCategory;
  label: string;
}[] = [
  { value: "pessoal", label: "Pessoal" },
  { value: "fiscal", label: "Fiscal" },
  { value: "contrato", label: "Contrato" },
  { value: "saude", label: "Saúde" },
  { value: "educacao", label: "Educação" },
  { value: "outro", label: "Outro" },
];

export const LIBRARY_ITEM_TYPES: {
  value: PessoalLibraryItemType;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "video", label: "Vídeo", icon: Video },
  { value: "ebook", label: "E-book", icon: BookOpen },
  { value: "artigo", label: "Artigo", icon: Newspaper },
  { value: "link", label: "Link", icon: Link2 },
  { value: "outro", label: "Outro", icon: Shapes },
];

export const LIBRARY_STATUSES: {
  value: PessoalLibraryItemStatus;
  label: string;
}[] = [
  { value: "para_ver", label: "Para ver" },
  { value: "vendo", label: "Vendo" },
  { value: "concluido", label: "Concluído" },
];

export const PROJECT_STATUSES: { value: PessoalProjectStatus; label: string }[] =
  [
    { value: "planejamento", label: "Planejamento" },
    { value: "em_andamento", label: "Em andamento" },
    { value: "pausado", label: "Pausado" },
    { value: "concluido", label: "Concluído" },
    { value: "arquivado", label: "Arquivado" },
  ];

export const TASK_PRIORITIES: {
  value: PessoalTaskPriority;
  label: string;
  color: string;
}[] = [
  { value: "baixa", label: "Baixa", color: "#89898d" },
  { value: "media", label: "Média", color: "#c98500" },
  { value: "alta", label: "Alta", color: "#e66767" },
];

export const TASK_STATUSES: { value: PessoalTaskStatus; label: string }[] = [
  { value: "pendente", label: "Pendente" },
  { value: "concluida", label: "Concluída" },
];
