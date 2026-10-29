"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { contarMinhasPendencias, deveReler, lerAprovacoes, type Aprovacao } from "@/lib/aprovacoes-shared";

interface AprovacoesApi {
  lista: Aprovacao[];
  /** Pendências em que EU posso votar (o número do badge). */
  minhas: number;
  /** Relê do servidor agora (depois de votar/cancelar). */
  recarregar: () => Promise<void>;
}

const AprovacoesContext = createContext<AprovacoesApi | null>(null);

/** null = sem provider (não é fundador/cofundador): badge e tela ficam ocultos. */
export function useAprovacoes(): AprovacoesApi | null {
  return useContext(AprovacoesContext);
}

/** Dois eventos seguidos (realtime em rajada) viram uma leitura só. */
const ESPERA_REALTIME_MS = 400;

/**
 * Pedidos de aprovação da empresa, para o badge do menu/sino e para a tela
 * /aprovacoes. Só fundador/cofundador (a tabela só é lida por eles; o layout
 * monta este provider apenas para o painel completo).
 *
 * - começa da lista que o servidor leu na página (sem piscar);
 * - realtime em `aprovacoes` (filtro workspace_id) → relê a lista, com debounce;
 * - ao voltar o foco da aba → relê, no máximo a cada 5 s;
 * - quando o servidor renderiza de novo (revalidate) a lista nova substitui a atual.
 * Ler a lista não escreve nada, então não gera novo evento realtime (sem laço),
 * e leituras simultâneas se juntam numa só.
 */
export function AprovacoesProvider({
  workspaceId,
  inicial,
  children,
}: {
  workspaceId: string;
  inicial: Aprovacao[];
  children: React.ReactNode;
}) {
  const [lista, setLista] = useState(inicial);
  const [inicialVisto, setInicialVisto] = useState(inicial);
  const emAndamento = useRef<Promise<void> | null>(null);
  const ultimaLeitura = useRef(0);

  // O servidor renderizou de novo (ex.: depois de uma ação): vale a lista nova.
  if (inicial !== inicialVisto) {
    setInicialVisto(inicial);
    setLista(inicial);
  }
  useEffect(() => {
    ultimaLeitura.current = Date.now();
  }, [inicial]);

  const recarregar = useCallback((): Promise<void> => {
    if (emAndamento.current) return emAndamento.current;
    const leitura = (async () => {
      try {
        const { data, error } = await createClient().rpc("listar_aprovacoes", {
          p_workspace_id: workspaceId,
        });
        if (!error) setLista(lerAprovacoes(data));
      } catch {
        // Sem rede: mantém a lista atual; a próxima leitura tenta de novo.
      } finally {
        ultimaLeitura.current = Date.now();
        emAndamento.current = null;
      }
    })();
    emAndamento.current = leitura;
    return leitura;
  }, [workspaceId]);

  useEffect(() => {
    const supabase = createClient();
    let agendado: ReturnType<typeof setTimeout> | null = null;
    let primeiraConexao = true;

    const channel = supabase
      .channel(`aprovacoes:${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "aprovacoes", filter: `workspace_id=eq.${workspaceId}` },
        () => {
          if (agendado) clearTimeout(agendado);
          agendado = setTimeout(() => void recarregar(), ESPERA_REALTIME_MS);
        }
      )
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        // A primeira conexão já parte da lista do servidor; reconexões podem ter perdido eventos.
        if (primeiraConexao) primeiraConexao = false;
        else void recarregar();
      });

    function aoVoltarOFoco() {
      if (!deveReler(Date.now(), ultimaLeitura.current, document.visibilityState !== "hidden")) return;
      void recarregar();
    }
    document.addEventListener("visibilitychange", aoVoltarOFoco);
    window.addEventListener("focus", aoVoltarOFoco);

    return () => {
      if (agendado) clearTimeout(agendado);
      document.removeEventListener("visibilitychange", aoVoltarOFoco);
      window.removeEventListener("focus", aoVoltarOFoco);
      void supabase.removeChannel(channel);
    };
  }, [workspaceId, recarregar]);

  const minhas = useMemo(() => contarMinhasPendencias(lista, new Date()), [lista]);
  const api = useMemo<AprovacoesApi>(() => ({ lista, minhas, recarregar }), [lista, minhas, recarregar]);

  return <AprovacoesContext.Provider value={api}>{children}</AprovacoesContext.Provider>;
}
