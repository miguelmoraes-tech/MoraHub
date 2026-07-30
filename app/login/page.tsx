"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/lib/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
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
            Mora <span className="text-copper-400">HUB</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Entre com sua conta para continuar
          </p>
        </div>

        <form
          action={formAction}
          className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-lg shadow-black/20"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-xs font-medium text-zinc-400"
            >
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="voce@empresa.com"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-xs font-medium text-zinc-400"
            >
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
            />
          </div>

          {state?.error && (
            <p className="rounded-lg border border-rose-900/50 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-copper-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Não tem conta?{" "}
          <Link href="/signup" className="font-medium text-copper-400 hover:text-copper-300">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
