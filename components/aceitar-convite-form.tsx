"use client";

import { useActionState } from "react";
import { aceitarConvite } from "@/lib/actions/convites";

export function AceitarConviteForm({ token }: { token: string }) {
  const action = aceitarConvite.bind(null, token);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex-1">
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Aceitando..." : "Aceitar convite"}
      </button>
      {state?.error && (
        <p className="mt-2 rounded-lg border border-rose-900/50 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
          {state.error}
        </p>
      )}
    </form>
  );
}
