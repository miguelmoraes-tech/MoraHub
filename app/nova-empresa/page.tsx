import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Clock, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getEmpresaAtiva, getEmpresasDoUsuario } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { ACESSO_VENDEDOR_AGUARDANDO, VENDEDOR_HOME } from "@/lib/vendedor-access";
import { NovaEmpresaForm } from "@/components/empresa/nova-empresa-form";
import { listarNichosDoCatalogo } from "@/lib/nichos";
import { CodigoVendedorForm } from "@/components/vendedor/codigo-vendedor-form";
import { requireUsuarioComSolicitacao } from "@/lib/vendedor";

export default async function NovaEmpresaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Quem já pertence a alguma empresa pode criar outra (a própria) sem perder
  // as que já tem; quem não tem nenhuma está criando a primeira.
  const [empresas, ativa, nichos] = await Promise.all([
    getEmpresasDoUsuario(),
    getEmpresaAtiva(),
    listarNichosDoCatalogo(supabase),
  ]);
  const primeira = empresas.length === 0;
  // Pedido de acesso (código) ainda sem resposta: a tela segue aberta, sem redirecionar a lugar nenhum.
  const { ultima } = await requireUsuarioComSolicitacao();
  const pedidoPendente = ultima?.status === "pendente";
  const voltarPara = ativa?.papel === "comercial" ? VENDEDOR_HOME : HOME_DONO;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-copper-400 text-zinc-950">
          <Building2 className="h-5 w-5" />
        </span>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
          {primeira ? "Como você quer começar?" : "Criar minha empresa"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {primeira
            ? "Crie a sua empresa ou entre numa que já existe, com o código que te passaram."
            : "Uma empresa só sua, com os próprios dados. O acesso às empresas onde você já trabalha continua igual."}
        </p>
      </div>

      {pedidoPendente && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            Você tem um pedido de acesso aguardando a aprovação do fundador da empresa.
          </span>
          <Link href={ACESSO_VENDEDOR_AGUARDANDO} className="text-xs font-medium underline">
            Ver pedido
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="criar-empresa" className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-lg shadow-black/20">
          <h2 id="criar-empresa" className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <Building2 className="h-4 w-4 text-copper-400" />
            Criar minha empresa
          </h2>
          <p className="mb-4 text-xs text-zinc-500">Dê um nome a ela. Você pode trocar depois e escolher quais módulos usar.</p>
          <NovaEmpresaForm nichos={nichos} />
        </section>

        <section aria-labelledby="entrar-com-codigo" className="self-start rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-lg shadow-black/20">
          <h2 id="entrar-com-codigo" className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <KeyRound className="h-4 w-4 text-teal-400" />
            Entrar numa empresa com código
          </h2>
          <p className="mb-4 text-xs text-zinc-500">
            Foi convidado como cofundador, sócio, funcionário ou vendedor? Digite o código. O fundador aprova o seu acesso e a
            empresa aparece no seu seletor de empresas.
          </p>
          <CodigoVendedorForm autoFocar={false} />
        </section>
      </div>

      {!primeira && (
        <p className="text-center text-xs">
          <Link href={voltarPara} className="font-medium text-zinc-400 hover:text-zinc-200">
            Voltar
          </Link>
        </p>
      )}

      <p className="text-center text-xs text-zinc-600">
        Conectado como <span className="text-zinc-400">{user.email}</span>
      </p>
    </div>
  );
}
