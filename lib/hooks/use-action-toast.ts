"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/toast";
import type { ActionState } from "@/lib/actions/types";

/**
 * Surfaces a server action's result as a toast: `error` states show the
 * message, `ok` states show `success` (when given) and then run `onSuccess`.
 * Fires once per new action result (useActionState returns a fresh object
 * each time).
 */
export function useActionToast(
  state: ActionState,
  options: { success?: string; onSuccess?: () => void } = {}
) {
  const toast = useToast();
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    if (!state) return;
    if ("error" in state) {
      toast.error(state.error);
      return;
    }
    if (latest.current.success) toast.success(latest.current.success);
    latest.current.onSuccess?.();
  }, [state, toast]);
}
