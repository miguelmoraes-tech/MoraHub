"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import type { SolicitacaoVendedor } from "@/lib/vendedor-shared";

/** A pending request as the bell lists it. */
export type SolicitacaoPendente = Pick<
  SolicitacaoVendedor,
  "id" | "email" | "created_at"
>;

type SolicitacoesApi = {
  pendentes: SolicitacaoPendente[];
  /** Drops a request from the list (after this tab approved/refused it). */
  remover: (id: string) => void;
  somAtivo: boolean;
  setSomAtivo: (ativo: boolean) => void;
};

const SolicitacoesContext = createContext<SolicitacoesApi | null>(null);

/** null when there is no provider (not a dono empresarial): bell and badge stay hidden. */
export function useSolicitacoes(): SolicitacoesApi | null {
  return useContext(SolicitacoesContext);
}

// --- "Som ligado" preference (per browser, shared across tabs) ---

const SOM_KEY = "hub:solicitacoes-som";
const SOM_EVENT = "hub:solicitacoes-som-change";

function lerSom(): boolean {
  try {
    return localStorage.getItem(SOM_KEY) !== "off";
  } catch {
    return true;
  }
}

function assinarSom(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(SOM_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SOM_EVENT, onChange);
  };
}

function gravarSom(ativo: boolean) {
  try {
    localStorage.setItem(SOM_KEY, ativo ? "on" : "off");
  } catch {
    // Storage blocked: the choice just doesn't persist.
  }
  window.dispatchEvent(new Event(SOM_EVENT));
}

/** Two short, quiet notes. Browsers may refuse audio before any interaction; that's fine. */
function tocarSom() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const inicio = ctx.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t0 = inicio + i * 0.14;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.06, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.22);
    });
    setTimeout(() => void ctx.close(), 600);
  } catch {
    // Blocked or unsupported: silent.
  }
}

function ordenar(lista: SolicitacaoPendente[]) {
  return [...lista].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/**
 * Pending vendedor access requests of the dono's workspace, kept live:
 * - starts from the list the server fetched on page load;
 * - re-fetches whenever the realtime channel (re)connects, so nothing sent
 *   while the tab was offline or asleep is missed;
 * - INSERT adds a request (counter + toast + sound), UPDATE to a final status
 *   removes it — also when the answer came from another tab.
 * RLS already limits the rows to the dono's own workspace; the channel filter
 * only narrows the traffic.
 */
export function SolicitacoesVendedorProvider({
  workspaceId,
  initialPendentes,
  children,
}: {
  workspaceId: string;
  initialPendentes: SolicitacaoPendente[];
  children: React.ReactNode;
}) {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [pendentes, setPendentes] = useState(() => ordenar(initialPendentes));
  const somAtivo = useSyncExternalStore(assinarSom, lerSom, () => true);

  // The /vendedores page lists the same requests from server props; let it
  // pick up changes. Kept in a ref so navigating doesn't re-subscribe.
  const naPaginaVendedores = pathname.startsWith("/vendedores");
  const atualizarPaginaRef = useRef(() => {});
  useEffect(() => {
    atualizarPaginaRef.current = () => {
      if (naPaginaVendedores) router.refresh();
    };
  }, [naPaginaVendedores, router]);

  useEffect(() => {
    const supabase = createClient();
    let ativo = true;

    async function buscarPendentes() {
      const { data } = await supabase
        .from("solicitacoes_vendedor")
        .select("id, email, created_at")
        .eq("workspace_id", workspaceId)
        .eq("status", "pendente")
        .order("created_at", { ascending: true });
      if (ativo && data) setPendentes(data as SolicitacaoPendente[]);
    }

    const channel = supabase
      .channel(`solicitacoes-vendedor:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "solicitacoes_vendedor",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            if (id) setPendentes((atual) => atual.filter((p) => p.id !== id));
            atualizarPaginaRef.current();
            return;
          }

          const row = payload.new as SolicitacaoVendedor;
          if (row.status === "pendente") {
            setPendentes((atual) =>
              atual.some((p) => p.id === row.id)
                ? atual
                : ordenar([
                    ...atual,
                    { id: row.id, email: row.email, created_at: row.created_at },
                  ])
            );
            if (payload.eventType === "INSERT") {
              toast.info(`Novo pedido de acesso: ${row.email ?? "sem e-mail"}`);
              if (lerSom()) tocarSom();
            }
          } else {
            setPendentes((atual) => atual.filter((p) => p.id !== row.id));
          }
          atualizarPaginaRef.current();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void buscarPendentes();
      });

    return () => {
      ativo = false;
      void supabase.removeChannel(channel);
    };
  }, [workspaceId, toast]);

  const remover = useCallback((id: string) => {
    setPendentes((atual) => atual.filter((p) => p.id !== id));
  }, []);

  const api = useMemo<SolicitacoesApi>(
    () => ({ pendentes, remover, somAtivo, setSomAtivo: gravarSom }),
    [pendentes, remover, somAtivo]
  );

  return (
    <SolicitacoesContext.Provider value={api}>
      {children}
    </SolicitacoesContext.Provider>
  );
}
