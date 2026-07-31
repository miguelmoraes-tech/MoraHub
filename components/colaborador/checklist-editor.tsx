"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { ChecklistItem } from "@/lib/types";

/**
 * Shared checklist UI — originally the inline checklist in fechamentos-grid
 * (fechamento mensal do contador), extracted so Compliance can reuse the
 * exact same list/progress/toggle behavior. The only addition is add/remove,
 * needed because pessoal_compliance rows start with an empty checklist
 * (unlike the business tables, which get a default set of items).
 */
export function ChecklistEditor({
  items,
  onChange,
}: {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}) {
  const [novoItem, setNovoItem] = useState("");
  const feitos = items.filter((i) => i.feito).length;

  function toggle(index: number) {
    onChange(
      items.map((entry, i) =>
        i === index ? { ...entry, feito: !entry.feito } : entry
      )
    );
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function add() {
    const texto = novoItem.trim();
    if (!texto) return;
    onChange([...items, { item: texto, feito: false }]);
    setNovoItem("");
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-zinc-400">
        Checklist
        {items.length > 0 && (
          <span className="text-zinc-600"> · {feitos}/{items.length} concluído</span>
        )}
      </p>
      <div className="space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5">
        {items.map((entry, index) => (
          <div key={`${entry.item}-${index}`} className="flex items-center gap-2">
            <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={entry.feito}
                onChange={() => toggle(index)}
                className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 accent-copper-600"
              />
              <span className={entry.feito ? "text-zinc-500 line-through" : ""}>
                {entry.item}
              </span>
            </label>
            <button
              type="button"
              onClick={() => remove(index)}
              className="shrink-0 rounded-md p-1 text-zinc-600 hover:bg-rose-950/50 hover:text-rose-400"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-zinc-600">Nenhum item no checklist ainda.</p>
        )}
        <div className="flex items-center gap-1.5 pt-1">
          <input
            value={novoItem}
            onChange={(e) => setNovoItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="Novo item do checklist"
            className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
          <button
            type="button"
            onClick={add}
            className="shrink-0 rounded-md p-1.5 text-copper-400 hover:bg-zinc-800 hover:text-copper-300"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
