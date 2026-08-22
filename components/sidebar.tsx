"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Target, Users, UserX, LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled?: boolean;
};

const GESTAO_ITEMS: NavItem[] = [
  { label: "Clientes", href: "/clientes", icon: Users, enabled: true },
  { label: "Leads", href: "/leads", icon: Target, enabled: true },
  { label: "Renegados", href: "/renegados", icon: UserX, enabled: true },
];

function NavGroup({ title, items }: { title: string; items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <div>
      <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
        {title}
      </p>
      <ul className="mt-2 space-y-0.5">
        {items.map((item) => {
          const isActive = item.enabled && pathname.startsWith(item.href);
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
    </div>
  );
}

export function Sidebar({ userEmail }: { userEmail: string }) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-zinc-900 bg-zinc-950">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <Image
          src="/logo.png"
          alt="Mora HUB"
          width={56}
          height={28}
          className="h-7 w-auto shrink-0 object-contain"
          priority
        />
        <span className="text-[15px] font-semibold tracking-tight text-zinc-50">
          Mora <span className="text-copper-400">HUB</span>
        </span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        <NavGroup title="Gestão" items={GESTAO_ITEMS} />
      </nav>

      <div className="border-t border-zinc-900 p-3">
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
