"use client";

import { Suspense, useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { signup } from "@/lib/actions/auth";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_STYLES, SIGNUP_OPCOES } from "@/lib/account-types";
import { isCollaboratorAccountType, type AccountType } from "@/lib/hub-mode";

function SignupForm() {
  const searchParams = useSearchParams();
  // An invite link (/convite/<token>) passes the invited papel, so the
  // person signing up skips the account-type step and gets the matching
  // account type — otherwise a vendedor could pick "Empresarial" and end up
  // with an empty company of their own instead of the vendedor area.
  const papelConvite = ACCOUNT_TYPES.find(
    (o) => o.value === searchParams.get("papel") && isCollaboratorAccountType(o.value)
  )?.value;
  const [step, setStep] = useState<1 | 2>(papelConvite ? 2 : 1);
  const [accountType, setAccountType] = useState<AccountType | null>(
    papelConvite ?? null
  );
  const [state, formAction, pending] = useActionState(signup, undefined);
  const redirectTo = searchParams.get("redirect") ?? "";
  const prefillEmail = searchParams.get("email") ?? "";
  const loginHref = redirectTo
    ? `/login?redirect=${encodeURIComponent(redirectTo)}&email=${encodeURIComponent(prefillEmail)}`
    : "/login";

  // Rótulo/ícone do tipo escolhido: o da opção do cadastro quando ela existe
  // (ex.: 'comercial' = "Sou funcionário"), senão o de ACCOUNT_TYPES (convites).
  const selected = ACCOUNT_TYPES.find((o) => o.value === accountType);
  const opcao = SIGNUP_OPCOES.find((o) => o.tipo === accountType);
  const selectedLabel = opcao?.label ?? selected?.label;
  const SelectedIcon = opcao?.icon ?? selected?.icon;

  return (
    <>
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
            Criar conta no <span className="text-copper-400">Mora HUB</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {step === 1 ? "Primeiro, escolha o tipo de conta" : "Agora, seus dados de acesso"}
          </p>
        </div>

        {step === 1 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SIGNUP_OPCOES.map((option) => {
              const Icon = option.icon;
              const styles = ACCOUNT_TYPE_STYLES[option.tipo];
              return (
                <button
                  key={option.tipo}
                  type="button"
                  onClick={() => {
                    setAccountType(option.tipo);
                    setStep(2);
                  }}
                  className={`flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-colors ${styles.card}`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-950 ${styles.iconBg}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className={`text-sm font-semibold ${styles.text}`}>
                    {option.label}
                  </span>
                  <span className="text-xs leading-relaxed text-zinc-500">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <form
            action={formAction}
            className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-lg shadow-black/20"
          >
            <input type="hidden" name="tipoConta" value={accountType ?? ""} />
            <input type="hidden" name="redirectTo" value={redirectTo} />

            {selected && SelectedIcon && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors ${ACCOUNT_TYPE_STYLES[selected.value].card}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-950 ${ACCOUNT_TYPE_STYLES[selected.value].iconBg}`}
                >
                  <SelectedIcon className="h-3.5 w-3.5" />
                </span>
                <span
                  className={`flex-1 truncate text-sm font-medium ${ACCOUNT_TYPE_STYLES[selected.value].text}`}
                >
                  {selectedLabel}
                </span>
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <ArrowLeft className="h-3 w-3" />
                  Trocar
                </span>
              </button>
            )}

            <div className="space-y-1.5">
              <label htmlFor="nome" className="text-xs font-medium text-zinc-400">
                Nome
              </label>
              <input
                id="nome"
                name="nome"
                type="text"
                autoComplete="name"
                placeholder="Seu nome"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-zinc-400">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue={prefillEmail}
                placeholder="voce@empresa.com"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-zinc-400">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
              />
            </div>

            {state?.error && (
              <p className="rounded-lg border border-rose-900/50 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
                {state.error}
              </p>
            )}
            {state?.info && (
              <p className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-300">
                {state.info}
              </p>
            )}

            <button
              type="submit"
              disabled={pending || !accountType}
              className={`w-full rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                selected ? ACCOUNT_TYPE_STYLES[selected.value].button : "bg-copper-600 hover:bg-copper-500"
              }`}
            >
              {pending ? "Criando conta..." : "Criar conta"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-zinc-500">
          Já tem conta?{" "}
          <Link href={loginHref} className="font-medium text-copper-400 hover:text-copper-300">
            Entrar
          </Link>
        </p>
      </div>
    </>
  );
}

export default function SignupPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <Suspense>
        <SignupForm />
      </Suspense>
    </div>
  );
}
