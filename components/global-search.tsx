"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Users,
  KeyRound,
  Server,
  FolderKanban,
  Wrench,
  Target,
  FileText,
} from "lucide-react";
import { buscarGlobal, type BuscaResposta, type BuscaResultado } from "@/lib/actions/search";

type GrupoKey = keyof BuscaResposta;

const GRUPOS: {
  key: GrupoKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  verTodosHref?: string;
}[] = [
  { key: "clientes", label: "Clientes", icon: Users, verTodosHref: "/clientes" },
  { key: "leads", label: "Leads", icon: Target, verTodosHref: "/leads" },
  { key: "documentos", label: "Documentos", icon: FileText, verTodosHref: "/documentos" },
  { key: "acessos", label: "Acessos", icon: KeyRound },
  { key: "infraestrutura", label: "Infraestrutura", icon: Server },
  { key: "projetos", label: "Projetos", icon: FolderKanban },
  { key: "servicos", label: "Serviços", icon: Wrench },
];

export function GlobalSearch({ incluirDocumentos }: { incluirDocumentos: boolean }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const latestQueryRef = useRef("");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BuscaResposta | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const open = () => {
    dialogRef.current?.showModal();
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const queryValida = query.trim().length >= 2;

  useEffect(() => {
    if (!queryValida) return;
    const q = query;
    const timeout = setTimeout(() => {
      latestQueryRef.current = q;
      setLoading(true);
      buscarGlobal(q).then((res) => {
        if (latestQueryRef.current === q) {
          setResults(res);
          setLoading(false);
          setActiveIndex(0);
        }
      });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const flatResults = useMemo(() => {
    if (!results) return [];
    const out: BuscaResultado[] = [];
    for (const grupo of GRUPOS) out.push(...results[grupo.key].itens);
    return out;
  }, [results]);

  function fechar() {
    dialogRef.current?.close();
  }

  function irPara(href: string) {
    fechar();
    router.push(href);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const alvo = flatResults[activeIndex];
      if (alvo) irPara(alvo.href);
    }
  }

  const semResultados =
    queryValida &&
    results !== null &&
    !loading &&
    GRUPOS.every((g) => results[g.key].itens.length === 0);

  let indiceCorrente = -1;

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="flex w-full items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-left text-sm text-zinc-500 transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-400"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">Buscar...</span>
        <kbd className="shrink-0 rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
          ⌘K
        </kbd>
      </button>

      {/* See new-cliente-dialog.tsx for why margin/display are handled this way. */}
      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-0 hidden h-full max-h-none w-full max-w-none open:flex items-start justify-center bg-transparent p-4 pt-[12vh] text-zinc-100 backdrop:bg-black/60"
        onClose={() => {
          setQuery("");
          setResults(null);
          setActiveIndex(0);
        }}
      >
        <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50">
          <div className="flex items-center gap-2.5 border-b border-zinc-800 px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-zinc-500" />
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                incluirDocumentos
                  ? "Buscar clientes, leads, documentos..."
                  : "Buscar clientes, leads..."
              }
              className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
            />
            <button
              type="button"
              onClick={fechar}
              className="shrink-0 text-zinc-500 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {!queryValida && (
              <p className="px-2 py-6 text-center text-xs text-zinc-600">
                Digite pelo menos 2 caracteres para buscar.
              </p>
            )}

            {queryValida && loading && !results && (
              <p className="px-2 py-6 text-center text-xs text-zinc-600">
                Buscando...
              </p>
            )}

            {semResultados && (
              <p className="px-2 py-6 text-center text-xs text-zinc-600">
                Nenhum resultado para &quot;{query}&quot;.
              </p>
            )}

            {queryValida &&
              results &&
              GRUPOS.map((grupo) => {
                const { itens, total } = results[grupo.key];
                if (itens.length === 0) return null;
                const Icon = grupo.icon;
                const restantes = total - itens.length;

                return (
                  <div key={grupo.key} className="mb-2 last:mb-0">
                    <p className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                      <Icon className="h-3 w-3" />
                      {grupo.label}
                    </p>
                    <div className="space-y-0.5">
                      {itens.map((item) => {
                        indiceCorrente += 1;
                        const isActive = indiceCorrente === activeIndex;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => irPara(item.href)}
                            onMouseEnter={() => setActiveIndex(indiceCorrente)}
                            className={`flex w-full flex-col items-start rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                              isActive
                                ? "bg-copper-600/15 text-copper-200"
                                : "text-zinc-300 hover:bg-zinc-900"
                            }`}
                          >
                            <span className="truncate text-sm">{item.titulo}</span>
                            {item.subtitulo && (
                              <span className="truncate text-xs text-zinc-500">
                                {item.subtitulo}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {restantes > 0 &&
                      (grupo.verTodosHref ? (
                        <button
                          type="button"
                          onClick={() => irPara(grupo.verTodosHref!)}
                          className="mt-0.5 w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-copper-400 hover:bg-zinc-900 hover:text-copper-300"
                        >
                          Ver todos ({total})
                        </button>
                      ) : (
                        <p className="mt-0.5 px-2.5 py-1 text-xs text-zinc-600">
                          +{restantes} não exibido(s) — refine a busca
                        </p>
                      ))}
                  </div>
                );
              })}
          </div>
        </div>
      </dialog>
    </>
  );
}
