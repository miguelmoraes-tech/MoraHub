import type { ComponentType } from "react";
import { Building2, Home, Calculator, Scale, Briefcase, Users2, LineChart } from "lucide-react";
import type { AccountType } from "@/lib/hub-mode";

export const ACCOUNT_TYPES: {
  value: AccountType;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  {
    value: "empresarial",
    label: "Conta Empresarial",
    description: "Para gerenciar seu negócio: clientes, leads, financeiro",
    icon: Building2,
  },
  {
    value: "pessoal",
    label: "Conta Pessoal",
    description: "Para organizar sua vida financeira e pessoal",
    icon: Home,
  },
  {
    value: "contador",
    label: "Conta Contador",
    description: "Para atender seus clientes de contabilidade em um só lugar",
    icon: Calculator,
  },
  {
    value: "advogado",
    label: "Conta Jurídica",
    description: "Para atender seus clientes de advocacia em um só lugar",
    icon: Scale,
  },
  {
    value: "financeiro",
    label: "Conta Financeiro",
    description:
      "Acesso de funcionário interno à área financeira de uma única empresa — não substitui o acesso do dono, é vinculada a apenas um negócio por vez",
    icon: Briefcase,
  },
  {
    value: "rh",
    label: "Conta RH",
    description:
      "Para gerenciar pessoas, contratação e folha de uma empresa — vinculada a apenas um negócio por vez, como o Financeiro",
    icon: Users2,
  },
  {
    value: "comercial",
    label: "Conta Comercial",
    description:
      "Para gerenciar vendas, funil de leads e comissões de uma empresa — vinculada a apenas um negócio por vez, como o Financeiro",
    icon: LineChart,
  },
];

export const ACCOUNT_TYPE_STYLES: Record<
  AccountType,
  {
    card: string;
    iconBg: string;
    text: string;
    button: string;
    /** Row highlight when this type is active and currently selected. */
    current: string;
    accentText: string;
  }
> = {
  empresarial: {
    card: "border-copper-600/40 bg-copper-600/10 hover:bg-copper-600/15",
    iconBg: "bg-copper-400",
    text: "text-copper-200",
    button: "bg-copper-600 hover:bg-copper-500",
    current: "border-copper-400 bg-copper-600/10",
    accentText: "text-copper-400",
  },
  pessoal: {
    card: "border-petrol-600/40 bg-petrol-600/10 hover:bg-petrol-600/15",
    iconBg: "bg-petrol-400",
    text: "text-petrol-200",
    button: "bg-petrol-600 hover:bg-petrol-500",
    current: "border-petrol-400 bg-petrol-600/10",
    accentText: "text-petrol-400",
  },
  contador: {
    card: "border-sky-600/40 bg-sky-600/10 hover:bg-sky-600/15",
    iconBg: "bg-sky-400",
    text: "text-sky-200",
    button: "bg-sky-600 hover:bg-sky-500",
    current: "border-sky-400 bg-sky-600/10",
    accentText: "text-sky-400",
  },
  advogado: {
    card: "border-violet-600/40 bg-violet-600/10 hover:bg-violet-600/15",
    iconBg: "bg-violet-400",
    text: "text-violet-200",
    button: "bg-violet-600 hover:bg-violet-500",
    current: "border-violet-400 bg-violet-600/10",
    accentText: "text-violet-400",
  },
  financeiro: {
    card: "border-emerald-600/40 bg-emerald-600/10 hover:bg-emerald-600/15",
    iconBg: "bg-emerald-400",
    text: "text-emerald-200",
    button: "bg-emerald-600 hover:bg-emerald-500",
    current: "border-emerald-400 bg-emerald-600/10",
    accentText: "text-emerald-400",
  },
  rh: {
    card: "border-amber-600/40 bg-amber-600/10 hover:bg-amber-600/15",
    iconBg: "bg-amber-400",
    text: "text-amber-200",
    button: "bg-amber-600 hover:bg-amber-500",
    current: "border-amber-400 bg-amber-600/10",
    accentText: "text-amber-400",
  },
  comercial: {
    card: "border-teal-600/40 bg-teal-600/10 hover:bg-teal-600/15",
    iconBg: "bg-teal-400",
    text: "text-teal-200",
    button: "bg-teal-600 hover:bg-teal-500",
    current: "border-teal-400 bg-teal-600/10",
    accentText: "text-teal-400",
  },
};
