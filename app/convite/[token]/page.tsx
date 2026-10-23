import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/actions/auth";
import { AceitarConviteForm } from "@/components/aceitar-convite-form";
import { RecusarConviteForm } from "@/components/recusar-convite-form";
import type { ColaboradorPapel, ConviteStatus } from "@/lib/types";

type ConvitePublico = {
  email_convidado: string;
  papel: ColaboradorPapel;
  status: ConviteStatus;
  dono_nome: string | null;
};

const PAPEL_LABEL: Record<ColaboradorPapel, string> = {
  contador: "Contador",
  advogado: "Advogado",
  financeiro: "Financeiro",
  rh: "RH",
  comercial: "Comercial",
  marketing: "Marketing",
};

const PAPEL_ACESSO_DESCRICAO: Record<ColaboradorPapel, string> = {
  contador: "com acesso à aba Jurídico & Contábil",
  advogado: "com acesso à aba Jurídico & Contábil",
  financeiro:
    "com acesso às seções financeiras da empresa (Contas a Pagar, Contas a Receber, Orçamento e Fluxo de Caixa) e à Folha de Pagamento",
  rh: "com acesso ao módulo de RH da empresa (Departamentos, Funcionários, Férias, Benefícios, Recrutamento, Avaliações, Ponto e Folha de Pagamento)",
  comercial:
    "com acesso à lista de leads da empresa (somente leitura), para marcar reuniões e converter leads em clientes",
  marketing: "com acesso ao calendário de conteúdo e às campanhas de marketing da empresa",
};

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .rpc("get_convite_by_token", { p_token: token })
    .maybeSingle();
  const convite = data as ConvitePublico | null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectParam = `/convite/${token}`;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt="Mora HUB"
            width={75}
            height={40}
            className="mx-auto mb-4 h-10 w-auto object-contain"
            priority
          />
          <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
            Convite para colaborar
          </h1>
        </div>

        <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-lg shadow-black/20">
          {!convite ? (
            <p className="text-sm text-zinc-300">
              Este convite não existe ou o link está incorreto.
            </p>
          ) : convite.status !== "pendente" ? (
            <p className="text-sm text-zinc-300">
              {convite.status === "aceito"
                ? "Este convite já foi aceito."
                : convite.status === "recusado"
                  ? "Este convite foi recusado."
                  : "Este convite expirou."}
            </p>
          ) : (
            <>
              <p className="text-sm text-zinc-300">
                <strong className="text-zinc-100">
                  {convite.dono_nome ?? "Alguém"}
                </strong>{" "}
                convidou você para colaborar como{" "}
                <strong className="text-zinc-100">
                  {PAPEL_LABEL[convite.papel]}
                </strong>{" "}
                no Mora HUB, {PAPEL_ACESSO_DESCRICAO[convite.papel]}.
              </p>

              {user ? (
                user.email === convite.email_convidado ? (
                  <div className="flex gap-2 pt-2">
                    <AceitarConviteForm token={token} />
                    <RecusarConviteForm
                      token={token}
                      label="Recusar"
                      className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-300">
                      Este convite foi enviado para {convite.email_convidado},
                      mas você está logado como {user.email}.
                    </p>
                    <form action={logout}>
                      <button
                        type="submit"
                        className="text-sm font-medium text-copper-400 hover:text-copper-300"
                      >
                        Sair e entrar com outra conta
                      </button>
                    </form>
                  </div>
                )
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="flex gap-2">
                    <Link
                      href={`/login?redirect=${encodeURIComponent(redirectParam)}&email=${encodeURIComponent(convite.email_convidado)}`}
                      className="flex-1 rounded-lg bg-copper-600 px-3.5 py-2 text-center text-sm font-medium text-white hover:bg-copper-500"
                    >
                      Já tenho conta
                    </Link>
                    <Link
                      href={`/signup?redirect=${encodeURIComponent(redirectParam)}&email=${encodeURIComponent(convite.email_convidado)}&papel=${convite.papel}`}
                      className="flex-1 rounded-lg border border-zinc-700 px-3.5 py-2 text-center text-sm font-medium text-zinc-200 hover:bg-zinc-800"
                    >
                      Criar conta
                    </Link>
                  </div>
                  <RecusarConviteForm
                    token={token}
                    label="Não quero colaborar"
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
