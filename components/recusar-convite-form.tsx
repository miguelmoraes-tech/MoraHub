"use client";

import { useActionState } from "react";
import { recusarConvite } from "@/lib/actions/convites";

export function RecusarConviteForm({
  token,
  label,
  className,
}: {
  token: string;
  label: string;
  className: string;
}) {
  const action = recusarConvite.bind(null, token);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction}>
      <button type="submit" disabled={pending} className={className}>
        {pending ? "Recusando..." : label}
      </button>
      {state?.error && (
        <p className="mt-2 rounded-lg border border-rose-900/50 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
          {state.error}
        </p>
      )}
    </form>
  );
}
