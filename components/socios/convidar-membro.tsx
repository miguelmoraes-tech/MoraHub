"use client";

import { useState, useTransition } from "react";
import { Check, Copy, UserPlus } from "lucide-react";
import { convidarMembro } from "@/app/(dashboard)/socios/actions";
import { useToast } from "@/components/toast";
import { MatrizPermissoes } from "@/components/socios/matriz-permissoes";
import {
  PAPEL_CONVIDAVEL_ROTULO,
  type ModuloPermissivel,
  type PapelConvidavel,
} from "@/lib/socios-shared";
import type { PermissaoModulo } from "@/lib/modulos/permissoes";

/**
 * Convite de sócio, funcionário ou (só o fundador) cofundador. O app não envia
 * e-mail: mostra o link /convite/<token> para a pessoa receber por onde o
 * fundador preferir. O token só existe neste momento — depois, o convite
 * pendente só pode ser cancelado e refeito.
 */
export function ConvidarMembro({
  modulos,
  ehFundador,
}: {
  modulos: ModuloPermissivel[];
  ehFundador: boolean;
}) {
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<PapelConvidavel>("socio");
  const [permissoes, setPermissoes] = useState<PermissaoModulo[]>([]);
  const [link, setLink] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, startEnviar] = useTransition();

  const papeis: PapelConvidavel[] = ehFundador
    ? ["socio", "funcionario", "cofundador"]
    : ["socio", "funcionario"];

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    startEnviar(async () => {
      const r = await convidarMembro({ email, papel, permissoes });
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setLink(`${window.location.origin}/convite/${r.token}`);
      setEmail("");
      setPermissoes([]);
      toast.success("Convite criado. Copie o link e envie para a pessoa.");
    });
  }

  async function copiar() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex items-center gap-1.5 rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500"
      >
        <UserPlus className="h-4 w-4" />
        Convidar
      </button>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">Convidar para a empresa</h2>
        <button
          type="button"
          onClick={() => {
            setAberto(false);
            setLink(null);
            setErro(null);
          }}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-200"
        >
          Fechar
        </button>
      </div>

      {link && (
        <div className="space-y-2 rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-3">
          <p className="text-xs text-emerald-300">
            Link do convite (vale por 7 dias). Ele só aparece agora; se perder, cancele e convide de
            novo.
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 font-mono text-xs text-zinc-200"
            />
            <button
              type="button"
              onClick={copiar}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
            >
              {copiado ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={enviar} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="convite-email" className="text-xs font-medium text-zinc-400">
              E-mail
            </label>
            <input
              id="convite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pessoa@empresa.com"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="convite-papel" className="text-xs font-medium text-zinc-400">
              Papel
            </label>
            <select
              id="convite-papel"
              value={papel}
              onChange={(e) => setPapel(e.target.value as PapelConvidavel)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
            >
              {papeis.map((p) => (
                <option key={p} value={p}>
                  {PAPEL_CONVIDAVEL_ROTULO[p]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {papel === "cofundador" ? (
          <p className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
            O cofundador tem o mesmo nível de acesso do fundador: vê todo o painel da empresa e
            gerencia a equipe. Não há permissões para escolher.
          </p>
        ) : (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-zinc-400">O que essa pessoa acessa</p>
            <MatrizPermissoes modulos={modulos} valor={permissoes} onChange={setPermissoes} />
          </div>
        )}

        {erro && (
          <p className="rounded-lg border border-rose-900/50 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
            {erro}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={enviando || !email}
            className="rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? "Criando..." : "Criar convite"}
          </button>
        </div>
      </form>
    </div>
  );
}
