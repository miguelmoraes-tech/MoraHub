"use client";

import { useState, useTransition } from "react";
import { Check, Copy, KeyRound, Pencil, Plus, RefreshCw } from "lucide-react";
import {
  atualizarSetor,
  criarSetor,
  regenerarCodigoSetor,
} from "@/app/(dashboard)/socios/actions";
import { useToast } from "@/components/toast";
import { StatusChip } from "@/components/status-chip";
import { MatrizPermissoes } from "@/components/socios/matriz-permissoes";
import {
  resumoPermissoes,
  type ModuloPermissivel,
  type SetorAcesso,
} from "@/lib/socios-shared";
import { formatarCodigoAcesso } from "@/lib/vendedor-shared";
import type { PermissaoModulo } from "@/lib/modulos/permissoes";

function CodigoCopiavel({ codigo }: { codigo: string }) {
  const toast = useToast();
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(formatarCodigoAcesso(codigo));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="select-all rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 font-mono text-sm tracking-[0.15em] text-zinc-100">
        {formatarCodigoAcesso(codigo)}
      </span>
      <button
        type="button"
        onClick={copiar}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
      >
        {copiado ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        {copiado ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

function FormSetor({
  modulos,
  inicial,
  onCancelar,
  onSalvar,
  salvando,
}: {
  modulos: ModuloPermissivel[];
  inicial?: SetorAcesso;
  onCancelar: () => void;
  onSalvar: (dados: { nome: string; descricao: string; permissoes: PermissaoModulo[] }) => void;
  salvando: boolean;
}) {
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [permissoes, setPermissoes] = useState<PermissaoModulo[]>(inicial?.permissoes ?? []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSalvar({ nome, descricao, permissoes });
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400">Nome do setor *</label>
          <input
            required
            minLength={2}
            maxLength={60}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Comercial interno"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400">Descrição</label>
          <input
            maxLength={300}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>
      </div>
      <MatrizPermissoes modulos={modulos} valor={permissoes} onChange={setPermissoes} />
      {inicial && (
        <p className="text-xs text-zinc-500">
          Mudar as permissões do setor não altera quem já entrou: essas pessoas se editam na aba
          Equipe.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={salvando || nome.trim().length < 2}
          className="rounded-md bg-copper-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-copper-500 disabled:opacity-60"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}

export function SetoresSection({
  modulos,
  setores,
  codigoVendedor,
}: {
  modulos: ModuloPermissivel[];
  setores: SetorAcesso[];
  codigoVendedor: string | null;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [regenerandoId, setRegenerandoId] = useState<string | null>(null);
  const nomes = Object.fromEntries(modulos.map((m) => [m.chave, m.nome]));

  function criar(dados: { nome: string; descricao: string; permissoes: PermissaoModulo[] }) {
    startTransition(async () => {
      const r = await criarSetor(dados);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      setCriando(false);
      toast.success("Setor criado.");
    });
  }

  function editar(
    id: string,
    dados: { nome: string; descricao: string; permissoes: PermissaoModulo[] }
  ) {
    startTransition(async () => {
      const r = await atualizarSetor(id, dados);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      setEditandoId(null);
      toast.success("Setor atualizado.");
    });
  }

  function alternarAtivo(s: SetorAcesso) {
    startTransition(async () => {
      const r = await atualizarSetor(s.id, { ativo: !s.ativo });
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success(s.ativo ? "Setor desativado." : "Setor ativado.");
    });
  }

  function regenerar(s: SetorAcesso) {
    startTransition(async () => {
      const r = await regenerarCodigoSetor(s.id);
      setRegenerandoId(null);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success("Novo código gerado. O anterior deixou de valer.");
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-zinc-500">
        Cada setor tem um código. A pessoa cria a conta, digita o código em &quot;Entrar numa
        empresa&quot; e você aprova o pedido pelo sino. Ao aprovar, ela entra como funcionário com
        as permissões do setor.
      </p>

      {codigoVendedor && (
        <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <KeyRound className="h-4 w-4 text-zinc-500" />
              Vendedor
            </p>
            <StatusChip tone="zinc">Somente leitura</StatusChip>
          </div>
          <CodigoCopiavel codigo={codigoVendedor} />
          <p className="text-xs text-zinc-500">
            O código de vendedor é gerenciado em Vendedores (gerar novo, aprovar pedidos).
          </p>
        </div>
      )}

      {criando ? (
        <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-sm font-semibold text-zinc-100">Novo setor</h2>
          <FormSetor
            modulos={modulos}
            onCancelar={() => setCriando(false)}
            onSalvar={criar}
            salvando={pending}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCriando(true)}
          className="flex items-center gap-1.5 rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500"
        >
          <Plus className="h-4 w-4" />
          Novo setor
        </button>
      )}

      <section className="space-y-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-600">
          Setores ({setores.length})
        </h2>
        {setores.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
            Nenhum setor criado ainda.
          </p>
        ) : (
          setores.map((s) => (
            <div
              key={s.id}
              className={`space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 ${
                s.ativo ? "" : "opacity-70"
              }`}
            >
              {editandoId === s.id ? (
                <FormSetor
                  modulos={modulos}
                  inicial={s}
                  onCancelar={() => setEditandoId(null)}
                  onSalvar={(dados) => editar(s.id, dados)}
                  salvando={pending}
                />
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-100">{s.nome}</p>
                      {s.descricao && <p className="text-xs text-zinc-500">{s.descricao}</p>}
                    </div>
                    <StatusChip tone={s.ativo ? "emerald" : "zinc"}>
                      {s.ativo ? "Ativo" : "Desativado"}
                    </StatusChip>
                  </div>
                  <p className="text-xs text-zinc-500">{resumoPermissoes(s.permissoes, nomes)}</p>
                  <CodigoCopiavel codigo={s.codigo} />
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-3">
                    <button
                      type="button"
                      onClick={() => setEditandoId(s.id)}
                      className="flex items-center gap-1.5 text-xs font-medium text-copper-400 hover:text-copper-300"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => alternarAtivo(s)}
                        disabled={pending}
                        className="text-xs font-medium text-zinc-400 hover:text-zinc-200 disabled:opacity-60"
                      >
                        {s.ativo ? "Desativar" : "Ativar"}
                      </button>
                      {regenerandoId === s.id ? (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-zinc-400">O código atual deixa de valer.</span>
                          <button
                            type="button"
                            onClick={() => regenerar(s)}
                            disabled={pending}
                            className="rounded-md bg-rose-600 px-2 py-1 font-medium text-white hover:bg-rose-500 disabled:opacity-60"
                          >
                            Gerar novo
                          </button>
                          <button
                            type="button"
                            onClick={() => setRegenerandoId(null)}
                            className="rounded-md px-2 py-1 font-medium text-zinc-400 hover:text-zinc-200"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRegenerandoId(s.id)}
                          className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-200"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Gerar novo código
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
