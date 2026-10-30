"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Target, CalendarDays, LogOut, KeyRound } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { EmpresaSwitcher } from "@/components/empresa/empresa-switcher";
import type { EmpresaVinculo } from "@/lib/empresas";
import { ACESSO_VENDEDOR_CODIGO } from "@/lib/vendedor-access";

// The vendedor menu is intentionally just these two entries. Route blocking
// for everything else lives in the proxy (lib/supabase/proxy.ts), not here.
const ITEMS = [
  { label: "Leads", href: "/vendedor/leads", icon: Target },
  { label: "Agenda", href: "/vendedor/agenda", icon: CalendarDays },
];

export function VendedorSidebar({
  userEmail,
  empresas,
  empresaAtivaId,
}: {
  userEmail: string;
  /** Empresas com vínculo ativo da conta (vendedor, dono ou sócio). */
  empresas: EmpresaVinculo[];
  empresaAtivaId: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-zinc-900 bg-zinc-950">
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
          Mora <span className="text-copper-400">HUB</span>
        </span>
        <span className="rounded-full border border-teal-700/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-teal-400">
          Vendedor
        </span>
      </div>

      <div className="border-b border-zinc-900 px-3 pb-4">
        <EmpresaSwitcher empresas={empresas} ativaId={empresaAtivaId} />
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-0.5">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-copper-600/15 text-copper-300"
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
      </nav>

      <div className="border-t border-zinc-900 p-3">
        <div className="mb-2 truncate px-2 text-xs text-zinc-500">{userEmail}</div>
        <Link
          href={ACESSO_VENDEDOR_CODIGO}
          className="mb-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
        >
          <KeyRound className="h-4 w-4" />
          Entrar numa empresa com código
        </Link>
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
