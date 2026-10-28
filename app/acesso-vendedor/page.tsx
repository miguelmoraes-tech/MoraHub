import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, KeyRound } from "lucide-react";
import { requireUsuarioComSolicitacao } from "@/lib/vendedor";
import { ACESSO_VENDEDOR_AGUARDANDO } from "@/lib/vendedor-access";
import { CodigoVendedorForm } from "@/components/vendedor/codigo-vendedor-form";
import { NOVA_EMPRESA } from "@/lib/empresa";
import { getEmpresasDoUsuario } from "@/lib/empresa-ativa";

export default async function CodigoDoGestorPage() {
  const { email, ultima } = await requireUsuarioComSolicitacao();
  const temEmpresa = (await getEmpresasDoUsuario()).length > 0;
  if (ultima?.status === "pendente") redirect(ACESSO_VENDEDOR_AGUARDANDO);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-teal-400 text-zinc-950">
          <KeyRound className="h-5 w-5" />
        </span>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
          Entrar numa empresa
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Digite o código que a empresa te passou (de vendedor ou de setor). O
          responsável aprova o seu acesso em seguida.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-lg shadow-black/20">
        <CodigoVendedorForm />
      </div>

      <p className="text-center text-xs text-zinc-500">
        Recebeu um link de convite? É só abrir o link, sem precisar do código.
      </p>

      <div className="flex items-center gap-3 text-xs text-zinc-600">
        <span className="h-px flex-1 bg-zinc-800" />
        ou
        <span className="h-px flex-1 bg-zinc-800" />
      </div>

      <Link
        href={NOVA_EMPRESA}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
      >
        <Building2 className="h-4 w-4" />
        Criar minha empresa
      </Link>

      {temEmpresa && (
        <Link
          href="/"
          className="block text-center text-xs font-medium text-zinc-400 hover:text-zinc-200"
        >
          Voltar para a minha empresa
        </Link>
      )}

      <p className="text-center text-xs text-zinc-600">
        Conectado como <span className="text-zinc-400">{email}</span>
      </p>
    </div>
  );
}
