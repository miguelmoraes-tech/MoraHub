import { EyeOff } from "lucide-react";

/**
 * Aviso das telas que são só valores (fluxo de caixa, DRE, rentabilidade...)
 * para quem tem o Financeiro mas não a opção "Ver valores".
 */
export function SemValoresAviso({ titulo }: { titulo: string }) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-lg font-semibold text-zinc-100">{titulo}</h1>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-20 text-center">
        <EyeOff className="h-8 w-8 text-zinc-700" />
        <p className="text-sm text-zinc-500">
          Esta tela mostra valores e saldos. Peça ao fundador a opção “Ver valores” no Financeiro.
        </p>
      </div>
    </div>
  );
}

/** Aviso de módulo indisponível (sem acesso, desligado ou falha de leitura). */
export function SemAcessoAviso({ titulo }: { titulo: string }) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-lg font-semibold text-zinc-100">{titulo}</h1>
      <p className="mt-4 text-sm text-zinc-500">Você não tem acesso a esta área.</p>
    </div>
  );
}
