export type PessoalAccountType =
  | "corrente"
  | "poupanca"
  | "cartao"
  | "carteira"
  | "investimento"
  | "outro";

export interface PessoalAccount {
  id: string;
  user_id: string;
  name: string;
  type: PessoalAccountType;
  balance: number;
  created_at: string;
  updated_at: string;
}

export type PessoalCategoryKind = "receita" | "despesa";

export interface PessoalCategory {
  id: string;
  user_id: string;
  name: string;
  kind: PessoalCategoryKind;
  color: string | null;
  created_at: string;
}

export type PessoalTransactionType = "receita" | "despesa";

export interface PessoalTransaction {
  id: string;
  user_id: string;
  account_id: string | null;
  category_id: string | null;
  type: PessoalTransactionType;
  amount: number;
  description: string | null;
  is_recurring: boolean;
  transaction_date: string;
  created_at: string;
}

export interface PessoalRecurringExpense {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  category_id: string | null;
  account_id: string | null;
  due_day: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type PessoalRecurringExpensePaymentStatus =
  | "pendente"
  | "atrasada"
  | "paga";

export interface PessoalRecurringExpensePayment {
  id: string;
  user_id: string;
  recurring_expense_id: string;
  reference_month: string;
  status: PessoalRecurringExpensePaymentStatus;
  paid_at: string | null;
  transaction_id: string | null;
  created_at: string;
}

export type PessoalInvestmentType =
  | "renda_fixa"
  | "tesouro_direto"
  | "acoes"
  | "fundos"
  | "cripto"
  | "previdencia"
  | "outro";

export interface PessoalInvestment {
  id: string;
  user_id: string;
  account_id: string | null;
  name: string;
  investment_type: PessoalInvestmentType;
  invested_amount: number;
  current_value: number | null;
  broker: string | null;
  purchase_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type PessoalDocumentCategory =
  | "pessoal"
  | "fiscal"
  | "contrato"
  | "saude"
  | "educacao"
  | "outro";

export interface PessoalDocument {
  id: string;
  user_id: string;
  name: string;
  category: PessoalDocumentCategory;
  storage_path: string | null;
  expires_at: string | null;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
}

export type PessoalLibraryItemType =
  | "video"
  | "ebook"
  | "artigo"
  | "link"
  | "outro";
export type PessoalLibraryItemStatus = "para_ver" | "vendo" | "concluido";

export interface PessoalLibraryItem {
  id: string;
  user_id: string;
  item_type: PessoalLibraryItemType;
  title: string | null;
  url: string | null;
  thumbnail_url: string | null;
  status: PessoalLibraryItemStatus;
  tags: string[] | null;
  notes: string | null;
  project_id: string | null;
  captured_at: string;
}

export type PessoalProjectStatus =
  | "planejamento"
  | "em_andamento"
  | "pausado"
  | "concluido"
  | "arquivado";

export type PessoalProjectLink = { label: string; url: string };

export interface PessoalProject {
  id: string;
  user_id: string;
  name: string;
  status: PessoalProjectStatus;
  links: PessoalProjectLink[];
  description: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export type PessoalTaskPriority = "baixa" | "media" | "alta";
export type PessoalTaskStatus = "pendente" | "concluida";

export interface PessoalTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: PessoalTaskPriority;
  status: PessoalTaskStatus;
  project_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PessoalInboxItem {
  id: string;
  user_id: string;
  content: string;
  is_triaged: boolean;
  created_at: string;
}
