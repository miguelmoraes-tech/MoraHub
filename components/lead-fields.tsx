"use client";

import { useState } from "react";
import type { Lead } from "@/lib/types";

export function LeadFields({ lead }: { lead?: Lead }) {
  const [temSite, setTemSite] = useState(lead?.tem_site ?? false);
  const [temInsta, setTemInsta] = useState(lead?.tem_insta ?? false);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1 sm:col-span-1">
          <label className="text-xs font-medium text-zinc-400">Nome *</label>
          <input
            name="nome"
            required
            defaultValue={lead?.nome}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>
        <div className="col-span-2 space-y-1 sm:col-span-1">
          <label className="text-xs font-medium text-zinc-400">
            Contato
          </label>
          <input
            name="contato"
            placeholder="Telefone, e-mail..."
            defaultValue={lead?.contato ?? ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5">
          <label className="flex items-center gap-2 text-sm text-zinc-200">
            <input
              type="checkbox"
              name="tem_site"
              checked={temSite}
              onChange={(e) => setTemSite(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-copper-600"
            />
            Tem site
          </label>
          {temSite && (
            <input
              name="site_link"
              placeholder="https://..."
              defaultValue={lead?.site_link ?? ""}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
            />
          )}
        </div>
        <div className="space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5">
          <label className="flex items-center gap-2 text-sm text-zinc-200">
            <input
              type="checkbox"
              name="tem_insta"
              checked={temInsta}
              onChange={(e) => setTemInsta(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-copper-600"
            />
            Tem Instagram
          </label>
          {temInsta && (
            <input
              name="insta_link"
              placeholder="https://instagram.com/..."
              defaultValue={lead?.insta_link ?? ""}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
            />
          )}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Descrição do perfil
        </label>
        <textarea
          name="descricao"
          rows={2}
          placeholder="Ex: perfil no Google Business, Instagram..."
          defaultValue={lead?.descricao ?? ""}
          className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400">
            Abordado por
          </label>
          <input
            name="abordado_por"
            defaultValue={lead?.abordado_por ?? ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400">Nicho</label>
          <input
            name="nicho"
            placeholder="Ex: Saúde, Varejo, Educação..."
            defaultValue={lead?.nicho ?? ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>
      </div>
    </div>
  );
}
