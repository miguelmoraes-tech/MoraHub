"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  LayoutGrid,
  Gavel,
  FileSignature,
  Inbox,
  Grid3x3,
  Wallet,
} from "lucide-react";
import type { ColaboradorPapel } from "@/lib/types";

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

const NAV_ITEMS: Record<ColaboradorPapel, NavItem[]> = {
  advogado: [
    { label: "Painel geral", href: "/colaborador/advogado", icon: LayoutGrid },
    { label: "Processos", href: "/colaborador/advogado/processos", icon: Gavel },
    {
      label: "Assinaturas",
      href: "/colaborador/advogado/assinaturas",
      icon: FileSignature,
    },
    {
      label: "Solicitações",
      href: "/colaborador/advogado/solicitacoes",
      icon: Inbox,
    },
  ],
  contador: [
    { label: "Painel geral", href: "/colaborador/contador", icon: LayoutGrid },
    {
      label: "Fechamento mensal",
      href: "/colaborador/contador/fechamentos",
      icon: Grid3x3,
    },
    {
      label: "Solicitações",
      href: "/colaborador/contador/solicitacoes",
      icon: Inbox,
    },
    {
      label: "Financeiro",
      href: "/colaborador/contador/financeiro",
      icon: Wallet,
    },
  ],
};

const PAPEL_LABEL: Record<ColaboradorPapel, string> = {
  advogado: "Advogado",
  contador: "Contador",
};

const ACCENT: Record<ColaboradorPapel, string> = {
  advogado: "bg-violet-600/15 text-violet-300",
  contador: "bg-sky-600/15 text-sky-300",
};

export function WorkspaceSidebar({
  papel,
  contasCount,
}: {
  papel: ColaboradorPapel;
  contasCount: number;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS[papel];
  const baseHref = `/colaborador/${papel}`;

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-900 bg-zinc-950">
      <div className="px-4 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
          Workspace
        </p>
        <p className="text-sm font-semibold text-zinc-100">
          {PAPEL_LABEL[papel]}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {contasCount} conta{contasCount === 1 ? "" : "s"} vinculada
          {contasCount === 1 ? "" : "s"}
        </p>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {items.map((item) => {
          const isActive =
            item.href === baseHref
              ? pathname === baseHref
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? ACCENT[papel]
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-900 p-3">
        <Link
          href="/colaborador"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Contas vinculadas
        </Link>
      </div>
    </aside>
  );
}
