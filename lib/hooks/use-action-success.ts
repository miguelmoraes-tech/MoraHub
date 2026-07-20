"use client";

import { useState } from "react";
import type { ActionState } from "@/lib/actions/types";

/**
 * Runs `onSuccess` once when a useActionState `state` transitions to an
 * `{ ok: true }` result. Adjusts state during render (React's sanctioned
 * alternative to a setState-in-effect) instead of a useEffect, since the
 * latter trips the react-hooks/set-state-in-effect rule.
 */
export function useActionSuccess(state: ActionState, onSuccess: () => void) {
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state && "ok" in state) {
      onSuccess();
    }
  }
}
