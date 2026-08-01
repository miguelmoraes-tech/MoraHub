"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Target,
  Users,
  UserX,
  BadgeCheck,
  CalendarClock,
  Receipt,
  Scale,
  FileText,
  LogOut,
  LayoutGrid,
  Landmark,
  ArrowLeftRight,
  Tags,
  Repeat,
  TrendingUp,
  Library,
  FolderKanban,
  ListChecks,
  Inbox,
  Users2,
  CreditCard,
  HandCoins,
  PieChart,
  LineChart,
  Building2,
  Palmtree,
  Gift,
  Banknote,
  Briefcase,
  ClipboardCheck,
  Clock,
  FileBarChart,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { ModeSwitcher } from "@/components/mode-switcher";
import { GlobalSearch } from "@/components/global-search";
import { GlobalChatBadge } from "@/components/chat/global-chat-badge";
import type { AccountType } from "@/lib/hub-mode";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled?: boolean;
};

type Accent = "copper" | "petrol";

const DASHBOARD_ITEMS: NavItem[] = [
  { label: "Financeiro", href: "/dashboard/financeiro", icon: Wallet, enabled: true },
  { label: "Clientes", href: "/dashboard/clientes", icon: LayoutDashboard, enabled: true },
  { label: "Leads", href: "/dashboard/leads", icon: Target, enabled: true },
];

const GESTAO_ITEMS: NavItem[] = [
  { label: "Clientes", href: "/clientes", icon: Users, enabled: true },
  { label: "Leads", href: "/leads", icon: Target, enabled: true },
  { label: "Renegados", href: "/renegados", icon: UserX, enabled: true },
  { label: "Assinantes", href: "/assinantes", icon: BadgeCheck, enabled: true },
  { label: "Calendário", href: "/calendario", icon: CalendarClock, enabled: true },
  { label: "Gastos", href: "/gastos", icon: Receipt, enabled: true },
  { label: "Jurídico & Contábil", href: "/juridico", icon: Scale, enabled: true },
  { label: "Documentos", href: "/documentos", icon: FileText, enabled: true },
  { label: "Contas a Pagar", href: "/contas-pagar", icon: CreditCard, enabled: true },
  { label: "Contas a Receber", href: "/contas-receber", icon: HandCoins, enabled: true },
  { label: "Orçamento", href: "/orcamentos", icon: PieChart, enabled: true },
  { label: "Fluxo de Caixa", href: "/fluxo-caixa", icon: LineChart, enabled: true },
  { label: "Rentabilidade", href: "/rentabilidade", icon: TrendingUp, enabled: true },
  { label: "Conciliação Bancária", href: "/conciliacao", icon: Landmark, enabled: true },
  { label: "DRE", href: "/dre", icon: FileBarChart, enabled: true },
];

const FINANCEIRO_ITEMS: NavItem[] = [
  { label: "Contas a Pagar", href: "/contas-pagar", icon: CreditCard, enabled: true },
  { label: "Contas a Receber", href: "/contas-receber", icon: HandCoins, enabled: true },
  { label: "Orçamento", href: "/orcamentos", icon: PieChart, enabled: true },
  { label: "Fluxo de Caixa", href: "/fluxo-caixa", icon: LineChart, enabled: true },
  { label: "Rentabilidade", href: "/rentabilidade", icon: TrendingUp, enabled: true },
  // The one RH screen Financeiro keeps — it's also where contas_pagar sync
  // lives. The rest of RH_ITEMS below is exclusive to the rh papel.
  { label: "Folha de Pagamento", href: "/rh/folha", icon: Banknote, enabled: true },
];

const COMERCIAL_ITEMS: NavItem[] = [
  { label: "Visão Geral", href: "/comercial", icon: LayoutGrid, enabled: true },
  { label: "Funil de Vendas", href: "/leads", icon: Target, enabled: true },
];

const RH_ITEMS: NavItem[] = [
  { label: "Visão Geral", href: "/rh", icon: LayoutGrid, enabled: true },
  { label: "Departamentos", href: "/rh/departamentos", icon: Building2, enabled: true },
  { label: "Funcionários", href: "/rh/funcionarios", icon: Users, enabled: true },
  { label: "Férias", href: "/rh/ferias", icon: Palmtree, enabled: true },
  { label: "Benefícios", href: "/rh/beneficios", icon: Gift, enabled: true },
  { label: "Folha de Pagamento", href: "/rh/folha", icon: Banknote, enabled: true },
  { label: "Recrutamento", href: "/rh/recrutamento", icon: Briefcase, enabled: true },
  { label: "Avaliações", href: "/rh/avaliacoes", icon: ClipboardCheck, enabled: true },
  { label: "Ponto", href: "/rh/ponto", icon: Clock, enabled: true },
];

const PAINEL_ITEMS: NavItem[] = [
  { label: "Visão Geral", href: "/pessoal", icon: LayoutGrid, enabled: true },
];

const FINANCAS_ITEMS: NavItem[] = [
  { label: "Contas", href: "/pessoal/contas", icon: Landmark, enabled: true },
  { label: "Transações", href: "/pessoal/transacoes", icon: ArrowLeftRight, enabled: true },
  { label: "Categorias", href: "/pessoal/categorias", icon: Tags, enabled: true },
  { label: "Gastos Recorrentes", href: "/pessoal/recorrentes", icon: Repeat, enabled: true },
  { label: "Investimentos", href: "/pessoal/investimentos", icon: TrendingUp, enabled: true },
];

const ORGANIZACAO_ITEMS: NavItem[] = [
  { label: "Documentos", href: "/pessoal/documentos", icon: FileText, enabled: true },
  { label: "Biblioteca", href: "/pessoal/biblioteca", icon: Library, enabled: true },
  { label: "Projetos", href: "/pessoal/projetos", icon: FolderKanban, enabled: true },
  { label: "Tarefas", href: "/pessoal/tarefas", icon: ListChecks, enabled: true },
  { label: "Inbox", href: "/pessoal/inbox", icon: Inbox, enabled: true },
  { label: "Jurídico", href: "/pessoal/juridico", icon: Scale, enabled: true },
];

function NavGroup({
  title,
  items,
  accent,
}: {
  title: string;
  items: NavItem[];
  accent: Accent;
}) {
  const pathname = usePathname();

  return (
    <div>
      <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
        {title}
      </p>
      <ul className="mt-2 space-y-0.5">
        {items.map((item) => {
          const isActive =
            item.enabled &&
            (item.href === "/pessoal" || item.href === "/rh" || item.href === "/comercial"
              ? pathname === item.href
              : pathname.startsWith(item.href));
          const Icon = item.icon;

          if (!item.enabled) {
            return (
              <li key={item.href}>
                <span className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-600">
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  <span className="rounded-full bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                    em breve
                  </span>
                </span>
              </li>
            );
          }

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? accent === "petrol"
                      ? "bg-petrol-600/15 text-petrol-300"
                      : "bg-copper-600/15 text-copper-300"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Sidebar({
  userEmail,
  userId,
  temColaboracoes,
  tiposAtivos,
  restritoFinanceiro,
  restritoRH,
  restritoComercial,
  chatHref,
  unreadTotal,
}: {
  userEmail: string;
  userId: string;
  temColaboracoes?: boolean;
  tiposAtivos: AccountType[];
  restritoFinanceiro?: boolean;
  restritoRH?: boolean;
  restritoComercial?: boolean;
  chatHref: string;
  unreadTotal: number;
}) {
  const pathname = usePathname();
  const isPessoal = pathname.startsWith("/pessoal");
  const accent: Accent = isPessoal ? "petrol" : "copper";
  const restrito = restritoFinanceiro || restritoRH || restritoComercial;

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-zinc-900 bg-zinc-950">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <Image
          src="/logo.png"
          alt="Mora HUB"
          width={53}
          height={28}
          className="h-7 w-auto shrink-0 object-contain"
          priority
        />
        <span className="text-[15px] font-semibold tracking-tight text-zinc-50">
          Mora{" "}
          <span
            className={`transition-colors duration-300 ${isPessoal ? "text-petrol-400" : "text-copper-400"}`}
          >
            HUB
          </span>
        </span>
        {restritoFinanceiro && (
          <span className="rounded-full border border-emerald-700/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-400">
            Financeiro
          </span>
        )}
        {restritoRH && (
          <span className="rounded-full border border-amber-700/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-400">
            RH
          </span>
        )}
        {restritoComercial && (
          <span className="rounded-full border border-teal-700/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-teal-400">
            Comercial
          </span>
        )}
      </div>

      {!restrito && (
        <div className="space-y-3 border-b border-zinc-900 px-3 pb-4">
          <GlobalSearch />
          <ModeSwitcher mode={isPessoal ? "pessoal" : "business"} tiposAtivos={tiposAtivos} />
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div key={accent} className="hub-mode-fade-in space-y-6">
          {restritoFinanceiro ? (
            <NavGroup title="Financeiro" items={FINANCEIRO_ITEMS} accent="copper" />
          ) : restritoRH ? (
            <NavGroup title="RH" items={RH_ITEMS} accent="copper" />
          ) : restritoComercial ? (
            <NavGroup title="Comercial" items={COMERCIAL_ITEMS} accent="copper" />
          ) : isPessoal ? (
            <>
              <NavGroup title="Painel" items={PAINEL_ITEMS} accent={accent} />
              <NavGroup title="Finanças" items={FINANCAS_ITEMS} accent={accent} />
              <NavGroup
                title="Organização"
                items={ORGANIZACAO_ITEMS}
                accent={accent}
              />
            </>
          ) : (
            <>
              <NavGroup title="Dashboards" items={DASHBOARD_ITEMS} accent={accent} />
              <NavGroup title="Gestão" items={GESTAO_ITEMS} accent={accent} />
              <NavGroup title="Comercial" items={COMERCIAL_ITEMS} accent={accent} />
              <NavGroup title="RH" items={RH_ITEMS} accent={accent} />
            </>
          )}
        </div>
      </nav>

      <div className="border-t border-zinc-900 p-3">
        <GlobalChatBadge
          href={chatHref}
          currentUserId={userId}
          initialCount={unreadTotal}
        />
        {temColaboracoes && (
          <Link
            href="/colaborador"
            className="mb-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
          >
            <Users2 className="h-4 w-4" />
            Colaborações
          </Link>
        )}
        <div className="mb-2 truncate px-2 text-xs text-zinc-500">
          {userEmail}
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-rose-300"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
