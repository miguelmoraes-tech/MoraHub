import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/actions/auth";

export default async function ColaboradorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-zinc-900 px-6 py-4">
        <Link href="/colaborador" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="Mora HUB"
            width={53}
            height={28}
            className="h-6 w-auto object-contain"
          />
          <span className="text-sm font-semibold tracking-tight text-zinc-50">
            Mora <span className="text-copper-400">HUB</span>
          </span>
          <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
            Colaborador
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-xs text-zinc-500">{user.email}</span>
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
