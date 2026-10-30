"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Blocks,
  Settings,
  Landmark,
  ArrowLeftRight,
  Tags,
  Repeat,
  TrendingUp,
  Library,
  FolderKanban,
  ListChecks,
  Inbox,
  FileText,
  Scale,
  UsersRound,
  ShieldCheck,
  LogOut,
  SlidersHorizontal,
  KeyRound,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { ModeSwitcher } from "@/components/mode-switcher";
import { EmpresaSwitcher } from "@/components/empresa/empresa-switcher";
import { GlobalSearch } from "@/components/global-search";
import { GlobalChatBadge } from "@/components/chat/global-chat-badge";
import { SolicitacoesBell } from "@/components/vendedor/solicitacoes-bell";
import { SinoAlertas, type ConfigSino } from "@/components/impressao-3d/sino-alertas";
import { useSolicitacoes } from "@/components/vendedor/solicitacoes-provider";
import { useAprovacoes } from "@/components/aprovacoes/aprovacoes-provider";
import type { AccountType } from "@/lib/hub-mode";
import type { EmpresaVinculo } from "@/lib/empresas";
import { iconeDe } from "@/components/modulos/icones";
import { CHAT_HABILITADO, rotaPermitida } from "@/lib/modulos/registry";
import { ACESSO_VENDEDOR_CODIGO } from "@/lib/vendedor-access";
import { gravarRolagem, lerRolagem } from "@/lib/sidebar-rolagem";
import {
  aplicarPreferenciaMenu,
  gruposDoMenu,
  type ItemNavegacao,
  type Preferencia,
} from "@/lib/modulos/preferencias";
import { useRotulos } from "@/components/rotulos-provider";
import { labelDoItemMenu, type Rotulos } from "@/lib/rotulos-shared";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Counter shown at the end of the item (live, from a provider). */
  badge?: "solicitacoes" | "aprovacoes";
};

type Accent = "copper" | "petrol";

// O menu do dono sai do registro de módulos (lib/modulos/registry.ts) ∩ os
// módulos ligados da empresa ativa (gruposDoMenu), com a preferência de
// navegação aplicada por cima (só aparência). Os ícones abaixo são dos itens
// fixos do painel; as listas seguintes, da Conta Pessoal.
const ICONE_FIXO: Record<string, React.ComponentType<{ className?: string }>> = {
  "/dashboard": LayoutGrid,
  "/modulos": Blocks,
  "/socios": UsersRound,
  "/aprovacoes": ShieldCheck,
  "/configuracoes": Settings,
};

function itemDeMenu(item: ItemNavegacao, rotulos: Rotulos): NavItem {
  const fixo = ICONE_FIXO[item.href];
  return {
    // Rótulo da empresa (nicho/modelo) quando houver; senão o nome do registro.
    label: fixo ? item.label : labelDoItemMenu(rotulos, item.href, item.label),
    href: item.href,
    icon: fixo ?? iconeDe(item.icone),
    badge: item.badge,
  };
}

const PAINEL_ITEMS: NavItem[] = [{ label: "Visão Geral", href: "/pessoal", icon: LayoutGrid }];

const FINANCAS_ITEMS: NavItem[] = [
  { label: "Contas", href: "/pessoal/contas", icon: Landmark },
  { label: "Transações", href: "/pessoal/transacoes", icon: ArrowLeftRight },
  { label: "Categorias", href: "/pessoal/categorias", icon: Tags },
  { label: "Gastos Recorrentes", href: "/pessoal/recorrentes", icon: Repeat },
  { label: "Investimentos", href: "/pessoal/investimentos", icon: TrendingUp },
];

const ORGANIZACAO_ITEMS: NavItem[] = [
  { label: "Documentos", href: "/pessoal/documentos", icon: FileText },
  { label: "Biblioteca", href: "/pessoal/biblioteca", icon: Library },
  { label: "Projetos", href: "/pessoal/projetos", icon: FolderKanban },
  { label: "Tarefas", href: "/pessoal/tarefas", icon: ListChecks },
  { label: "Inbox", href: "/pessoal/inbox", icon: Inbox },
  { label: "Jurídico", href: "/pessoal/juridico", icon: Scale },
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
  const aprovacoes = useAprovacoes();

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
            item.href === "/pessoal" || item.href === "/rh" || item.href === "/marketing" || item.href === "/juridico" || item.href === "/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-copper-500 ${
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
                {item.badge === "aprovacoes" && aprovacoes && aprovacoes.minhas > 0 && (
                  <span
                    className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-copper-600 px-1 text-[10px] font-semibold text-white"
                    aria-label={`${aprovacoes.minhas} aprovação(ões) esperando seu voto`}
                  >
                    {aprovacoes.minhas > 99 ? "99+" : aprovacoes.minhas}
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
  tiposAtivos,
  chatHref,
  unreadTotal,
  modulosHabilitados,
  painelCompleto,
  restrito,
  empresas,
  empresaAtivaId,
  sinoAlertas = null,
  preferencia = null,
}: {
  userEmail: string;
  userId: string;
  tiposAtivos: AccountType[];
  chatHref: string;
  unreadTotal: number;
  /** Módulos ligados da empresa ativa (workspace_modulos). */
  modulosHabilitados: string[];
  /** Fundador/cofundador da empresa ativa (vê Módulos, Sócios e Configurações). */
  painelCompleto: boolean;
  /** Sócio/funcionário: menu só com os módulos que as permissões liberam (já em modulosHabilitados). */
  restrito: boolean;
  /** Empresas com vínculo ativo da conta, para o seletor. */
  empresas: EmpresaVinculo[];
  empresaAtivaId: string | null;
  /** Sino de alertas do nicho Impressão 3D; null = empresa sem Dashboard/Automações ligados. */
  sinoAlertas?: ConfigSino | null;
  /** Preferência de navegação que vale (pessoal → padrão da empresa); null = ordem do registro. */
  preferencia?: Preferencia | null;
}) {
  const pathname = usePathname();
  const rotulos = useRotulos();
  const isPessoal = pathname.startsWith("/pessoal");
  const accent: Accent = isPessoal ? "petrol" : "copper";
  const gruposMenu = aplicarPreferenciaMenu(gruposDoMenu(modulosHabilitados, painelCompleto, restrito), preferencia);

  // A barra inteira rola (cabeçalho, busca, seletores e todos os grupos, inclusive "Empresa"); só o rodapé fica fixo.
  const rolagemRef = useRef<HTMLDivElement>(null);
  const primeiraVez = useRef(true);
  const quadro = useRef(0);

  // Restaura a posição se a barra remontou (a barra vive no layout, então navegar não a remonta).
  useEffect(() => {
    const el = rolagemRef.current;
    if (el) el.scrollTop = lerRolagem(window.sessionStorage);
  }, []);

  // O item ativo fica visível dentro da área rolável; sem animar na primeira carga nem com movimento reduzido.
  useEffect(() => {
    const ativo = rolagemRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!ativo) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ativo.scrollIntoView({ block: "nearest", behavior: primeiraVez.current || reduzir ? "auto" : "smooth" });
    primeiraVez.current = false;
  }, [pathname]);

  function aoRolar() {
    if (quadro.current) return;
    quadro.current = requestAnimationFrame(() => {
      quadro.current = 0;
      if (rolagemRef.current) gravarRolagem(window.sessionStorage, rolagemRef.current.scrollTop);
    });
  }

  return (
    <aside className="flex h-dvh w-64 shrink-0 flex-col border-r border-zinc-900 bg-zinc-950">
      {/* Única área rolável: min-h-0 deixa o flex encolher e o overflow funcionar de verdade. */}
      <div
        ref={rolagemRef}
        onScroll={aoRolar}
        data-sidebar-scroll
        className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
      >
      <div data-sidebar-header className="relative flex items-center gap-2.5 px-5 py-6">
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
        {!isPessoal && (
          <div className="ml-auto flex items-center gap-0.5">
            {sinoAlertas && empresaAtivaId && (
              <SinoAlertas key={empresaAtivaId} empresaId={empresaAtivaId} config={sinoAlertas} />
            )}
            <SolicitacoesBell />
          </div>
        )}
      </div>

      <div className="space-y-3 border-b border-zinc-900 px-3 pb-4">
        {!restrito && (
          <GlobalSearch incluirDocumentos={rotaPermitida("/documentos", modulosHabilitados)} />
        )}
        {!isPessoal && <EmpresaSwitcher empresas={empresas} ativaId={empresaAtivaId} />}
        <ModeSwitcher mode={isPessoal ? "pessoal" : "business"} tiposAtivos={tiposAtivos} />
      </div>

      <nav aria-label="Menu principal" className="px-3 py-4">
        <div key={accent} className="hub-mode-fade-in space-y-6">
          {isPessoal ? (
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
              {gruposMenu.map((grupo) => (
                <NavGroup
                  key={grupo.titulo}
                  title={grupo.titulo}
                  items={grupo.itens.map((item) => itemDeMenu(item, rotulos))}
                  accent={accent}
                  habilitados={modulosHabilitados}
                />
              ))}
            </>
          )}
        </div>
      </nav>

      </div>

      {/* Rodapé fixo: fora da área rolável. */}
      <div className="shrink-0 border-t border-zinc-900 bg-zinc-950 p-3">
        {CHAT_HABILITADO && (
          <GlobalChatBadge
            href={chatHref}
            currentUserId={userId}
            initialCount={unreadTotal}
          />
        )}
        <div className="mb-2 truncate px-2 text-xs text-zinc-500">
          {userEmail}
        </div>
        {!isPessoal && (painelCompleto || (restrito && modulosHabilitados.length > 0)) && (
          <Link
            href="/configuracoes/navegacao"
            className="mb-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-400 outline-none transition-colors hover:bg-zinc-900 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-copper-500"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Personalizar navegação
          </Link>
        )}
        {/* Qualquer conta logada (fundador, cofundador, sócio, funcionário) pode entrar noutra empresa com um código. */}
        <Link
          href={ACESSO_VENDEDOR_CODIGO}
          className="mb-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-400 outline-none transition-colors hover:bg-zinc-900 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-copper-500"
        >
          <KeyRound className="h-4 w-4" />
          Entrar numa empresa com código
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-400 outline-none transition-colors hover:bg-zinc-900 hover:text-rose-300 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-copper-500"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
