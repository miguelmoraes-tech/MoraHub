import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getEmpresaAtiva, getEmpresasDoUsuario } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { VENDEDOR_HOME } from "@/lib/vendedor-access";
import { NovaEmpresaForm } from "@/components/empresa/nova-empresa-form";

export default async function NovaEmpresaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Quem já pertence a alguma empresa pode criar outra (a própria) sem perder
  // as que já tem; quem não tem nenhuma está criando a primeira.
  const [empresas, ativa] = await Promise.all([getEmpresasDoUsuario(), getEmpresaAtiva()]);
  const primeira = empresas.length === 0;
  const voltarPara = ativa?.papel === "comercial" ? VENDEDOR_HOME : HOME_DONO;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-copper-400 text-zinc-950">
          <Building2 className="h-5 w-5" />
        </span>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
          {primeira ? "Dê um nome à sua empresa" : "Criar minha empresa"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {primeira
            ? "Você pode trocar depois. Em seguida você escolhe quais módulos usar."
            : "Uma empresa só sua, com os próprios dados. O acesso às empresas onde você já trabalha continua igual."}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-lg shadow-black/20">
        <NovaEmpresaForm />
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
