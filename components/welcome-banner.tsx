"use client";

import { Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PartyPopper, X } from "lucide-react";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_STYLES } from "@/lib/account-types";
import type { AccountType } from "@/lib/hub-mode";

const VALID_TYPES: AccountType[] = ["empresarial", "pessoal", "contador", "advogado"];

function WelcomeBannerInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const bemvindo = searchParams.get("bemvindo");
  const tipo = VALID_TYPES.find((t) => t === bemvindo);
  if (!tipo) return null;

  const option = ACCOUNT_TYPES.find((o) => o.value === tipo);
  const styles = ACCOUNT_TYPE_STYLES[tipo];
  const label = option?.label.replace(/^Conta /, "") ?? "";

  function dismiss() {
    router.replace(pathname, { scroll: false });
  }

  return (
    <div className="border-b border-zinc-900 bg-zinc-900/40 px-6 py-3">
      <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${styles.card} ${styles.text}`}>
        <div className="flex items-center gap-2">
          <PartyPopper className={`h-4 w-4 shrink-0 ${styles.accentText}`} />
          <span>Bem-vindo ao modo {label}!</span>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-md p-1 opacity-70 hover:bg-zinc-900/40 hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function WelcomeBanner() {
  return (
    <Suspense fallback={null}>
      <WelcomeBannerInner />
    </Suspense>
  );
}
