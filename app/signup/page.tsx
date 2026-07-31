"use client";

import { Suspense, useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Building2, Home, Calculator, Scale, ArrowLeft } from "lucide-react";
import { signup } from "@/lib/actions/auth";
import type { AccountType } from "@/lib/hub-mode";

const ACCOUNT_TYPES: {
  value: AccountType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "empresarial",
    label: "Conta Empresarial",
    description: "Para gerenciar seu negócio: clientes, leads, financeiro",
    icon: Building2,
  },
  {
    value: "pessoal",
    label: "Conta Pessoal",
    description: "Para organizar sua vida financeira e pessoal",
    icon: Home,
  },
  {
    value: "contador",
    label: "Conta Contador",
    description: "Para atender seus clientes de contabilidade em um só lugar",
    icon: Calculator,
  },
  {
    value: "advogado",
    label: "Conta Jurídica",
    description: "Para atender seus clientes de advocacia em um só lugar",
    icon: Scale,
  },
];

const ACCOUNT_TYPE_STYLES: Record<
  AccountType,
  { card: string; iconBg: string; text: string; button: string }
> = {
  empresarial: {
    card: "border-copper-600/40 bg-copper-600/10 hover:bg-copper-600/15",
    iconBg: "bg-copper-400",
    text: "text-copper-200",
    button: "bg-copper-600 hover:bg-copper-500",
  },
  pessoal: {
    card: "border-petrol-600/40 bg-petrol-600/10 hover:bg-petrol-600/15",
    iconBg: "bg-petrol-400",
    text: "text-petrol-200",
    button: "bg-petrol-600 hover:bg-petrol-500",
  },
  contador: {
    card: "border-sky-600/40 bg-sky-600/10 hover:bg-sky-600/15",
    iconBg: "bg-sky-400",
    text: "text-sky-200",
    button: "bg-sky-600 hover:bg-sky-500",
  },
  advogado: {
    card: "border-violet-600/40 bg-violet-600/10 hover:bg-violet-600/15",
    iconBg: "bg-violet-400",
    text: "text-violet-200",
    button: "bg-violet-600 hover:bg-violet-500",
  },
};

function SignupForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [state, formAction, pending] = useActionState(signup, undefined);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "";
  const prefillEmail = searchParams.get("email") ?? "";
  const loginHref = redirectTo
    ? `/login?redirect=${encodeURIComponent(redirectTo)}&email=${encodeURIComponent(prefillEmail)}`
    : "/login";

  const selected = ACCOUNT_TYPES.find((o) => o.value === accountType);

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
          <div className="grid grid-cols-2 gap-3">
            {ACCOUNT_TYPES.map((option) => {
              const Icon = option.icon;
              const styles = ACCOUNT_TYPE_STYLES[option.value];
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setAccountType(option.value);
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

            {selected && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors ${ACCOUNT_TYPE_STYLES[selected.value].card}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-950 ${ACCOUNT_TYPE_STYLES[selected.value].iconBg}`}
                >
                  <selected.icon className="h-3.5 w-3.5" />
                </span>
                <span
                  className={`flex-1 truncate text-sm font-medium ${ACCOUNT_TYPE_STYLES[selected.value].text}`}
                >
                  {selected.label}
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
