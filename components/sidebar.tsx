"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Target,
  Users,
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
  Blocks,
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
  LifeBuoy,
  Megaphone,
  CalendarDays,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { ModeSwitcher } from "@/components/mode-switcher";
import { GlobalSearch } from "@/components/global-search";
import { GlobalChatBadge } from "@/components/chat/global-chat-badge";
import { SolicitacoesBell } from "@/components/vendedor/solicitacoes-bell";
import { useSolicitacoes } from "@/components/vendedor/solicitacoes-provider";
import type { AccountType } from "@/lib/hub-mode";
import { iconeDe } from "@/components/modulos/icones";
import {
  CHAT_HABILITADO,
  COLABORADOR_HABILITADO,
  menuDoDono,
  rotaPermitida,
  type ItemMenu,
} from "@/lib/modulos/registry";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled?: boolean;
  /** Counter shown at the end of the item (live, from a provider). */
  badge?: "solicitacoes";
};

type Accent = "copper" | "petrol";

// O menu do dono sai do registro de módulos (lib/modulos/registry.ts) ∩ os
// módulos ligados da empresa. Estas listas são só dos menus restritos de
// colaborador (financeiro/rh/comercial/marketing) e da Conta Pessoal.
const VISAO_GERAL: NavItem = {
  label: "Visão Geral",
  href: "/dashboard",
  icon: LayoutGrid,
  enabled: true,
};

const MODULOS_ITEM: NavItem = {
  label: "Módulos",
  href: "/modulos",
  icon: Blocks,
  enabled: true,
};

function itemDeMenu(item: ItemMenu): NavItem {
  return {
    label: item.label,
    href: item.href,
    icon: iconeDe(item.icone),
    enabled: true,
    badge: item.badge,
  };
}

const FINANCEIRO_ITEMS: NavItem[] = [
  { label: "Contas a Pagar", href: "/contas-pagar", icon: CreditCard, enabled: true },
  { label: "Contas a Receber", href: "/contas-receber", icon: HandCoins, enabled: true },
  { label: "Orçamento", href: "/orcamentos", icon: PieChart, enabled: true },
  { label: "Fluxo de Caixa", href: "/fluxo-caixa", icon: LineChart, enabled: true },
  { label: "Rentabilidade", href: "/rentabilidade", icon: TrendingUp, enabled: true },
  // The one RH screen Financeiro keeps — it's also where contas_pagar sync
  // lives. The rest of RH_ITEMS below is exclusive to the rh papel.
  { label: "Folha de Pagamento", href: "/rh/folha", icon: Banknote, enabled: true },
  { label: "Suporte", href: "/suporte", icon: LifeBuoy, enabled: true },
];

const COMERCIAL_ITEMS: NavItem[] = [
  { label: "Visão Geral", href: "/comercial", icon: LayoutGrid, enabled: true },
  { label: "Funil de Vendas", href: "/leads", icon: Target, enabled: true },
  { label: "Suporte", href: "/suporte", icon: LifeBuoy, enabled: true },
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
  { label: "Suporte", href: "/suporte", icon: LifeBuoy, enabled: true },
];

const MARKETING_ITEMS: NavItem[] = [
  { label: "Visão Geral", href: "/marketing", icon: LayoutGrid, enabled: true },
  { label: "Calendário de Conteúdo", href: "/marketing/calendario", icon: CalendarDays, enabled: true },
  { label: "Campanhas", href: "/marketing/campanhas", icon: Megaphone, enabled: true },
  { label: "Suporte", href: "/suporte", icon: LifeBuoy, enabled: true },
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
  habilitados,
}: {
  title: string;
  items: NavItem[];
  accent: Accent;
  /** Módulos ligados da empresa; item de rota de módulo desligado não aparece. */
  habilitados: string[];
}) {
  const pathname = usePathname();
  const solicitacoes = useSolicitacoes();

  // Módulos desligados não aparecem no menu; as listas ficam intactas para
  // quando forem religados.
  const visiveis = items.filter((item) => rotaPermitida(item.href, habilitados));
  if (visiveis.length === 0) return null;

  return (
    <div>
      <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
        {title}
      </p>
      <ul className="mt-2 space-y-0.5">
        {visiveis.map((item) => {
          const isActive =
            item.enabled &&
            (item.href === "/pessoal" ||
            item.href === "/rh" ||
            item.href === "/comercial" ||
            item.href === "/marketing" ||
            item.href === "/dashboard"
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
                <span className="flex-1">{item.label}</span>
                {item.badge === "solicitacoes" &&
                  solicitacoes &&
                  solicitacoes.pendentes.length > 0 && (
                    <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-copper-600 px-1 text-[10px] font-semibold text-white">
                      {solicitacoes.pendentes.length > 99
                        ? "99+"
                        : solicitacoes.pendentes.length}
                    </span>
                  )}
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
  restritoMarketing,
  chatHref,
  unreadTotal,
  modulosHabilitados,
  ehDono,
}: {
  userEmail: string;
  userId: string;
  temColaboracoes?: boolean;
  tiposAtivos: AccountType[];
  restritoFinanceiro?: boolean;
  restritoRH?: boolean;
  restritoComercial?: boolean;
  restritoMarketing?: boolean;
  chatHref: string;
  unreadTotal: number;
  /** Módulos ligados da empresa do usuário (workspace_modulos). */
  modulosHabilitados: string[];
  /** Dono de uma empresa vendo o próprio painel (vê a página Módulos). */
  ehDono: boolean;
}) {
  const pathname = usePathname();
  const isPessoal = pathname.startsWith("/pessoal");
  const accent: Accent = isPessoal ? "petrol" : "copper";
  const restrito = restritoFinanceiro || restritoRH || restritoComercial || restritoMarketing;

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-zinc-900 bg-zinc-950">
      <div className="relative flex items-center gap-2.5 px-5 py-6">
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
        {restritoMarketing && (
          <span className="rounded-full border border-pink-700/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-pink-400">
            Marketing
          </span>
        )}
        {!restrito && !isPessoal && <SolicitacoesBell />}
      </div>

      {!restrito && (
        <div className="space-y-3 border-b border-zinc-900 px-3 pb-4">
          <GlobalSearch incluirDocumentos={rotaPermitida("/documentos", modulosHabilitados)} />
          <ModeSwitcher mode={isPessoal ? "pessoal" : "business"} tiposAtivos={tiposAtivos} />
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div key={accent} className="hub-mode-fade-in space-y-6">
          {restritoFinanceiro ? (
            <NavGroup title="Financeiro" items={FINANCEIRO_ITEMS} accent="copper" habilitados={modulosHabilitados} />
          ) : restritoRH ? (
            <NavGroup title="RH" items={RH_ITEMS} accent="copper" habilitados={modulosHabilitados} />
          ) : restritoComercial ? (
            <NavGroup title="Comercial" items={COMERCIAL_ITEMS} accent="copper" habilitados={modulosHabilitados} />
          ) : restritoMarketing ? (
            <NavGroup title="Marketing" items={MARKETING_ITEMS} accent="copper" habilitados={modulosHabilitados} />
          ) : isPessoal ? (
            <>
              <NavGroup title="Painel" items={PAINEL_ITEMS} accent={accent} habilitados={modulosHabilitados} />
              <NavGroup title="Finanças" items={FINANCAS_ITEMS} accent={accent} habilitados={modulosHabilitados} />
              <NavGroup
                title="Organização"
                items={ORGANIZACAO_ITEMS}
                accent={accent}
                habilitados={modulosHabilitados}
              />
            </>
          ) : (
            <>
              <NavGroup
                title="Dashboards"
                items={[VISAO_GERAL]}
                accent={accent}
                habilitados={modulosHabilitados}
              />
              {menuDoDono(modulosHabilitados).map((grupo) => (
                <NavGroup
                  key={grupo.titulo}
                  title={grupo.titulo}
                  items={grupo.itens.map(itemDeMenu)}
                  accent={accent}
                  habilitados={modulosHabilitados}
                />
              ))}
              {ehDono && (
                <NavGroup
                  title="Empresa"
                  items={[MODULOS_ITEM]}
                  accent={accent}
                  habilitados={modulosHabilitados}
                />
              )}
            </>
          )}
        </div>
      </nav>

      <div className="border-t border-zinc-900 p-3">
        {CHAT_HABILITADO && (
          <GlobalChatBadge
            href={chatHref}
            currentUserId={userId}
            initialCount={unreadTotal}
          />
        )}
        {temColaboracoes && COLABORADOR_HABILITADO && (
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
