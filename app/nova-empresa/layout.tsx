import Image from "next/image";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { ToastProvider } from "@/components/toast";

/** Shell sem sidebar da tela de criação da primeira empresa. */
export default function NovaEmpresaLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Mora HUB"
              width={53}
              height={28}
              className="h-6 w-auto object-contain"
              priority
            />
            <span className="text-sm font-semibold tracking-tight text-zinc-50">
              Mora <span className="text-copper-400">HUB</span>
            </span>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </form>
        </header>
        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </ToastProvider>
  );
}
