function suggestedNextDate(intervaloFollowupDias: number | null) {
  const dias = intervaloFollowupDias ?? 3;
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function FollowupFields({
  intervaloFollowupDias,
}: {
  intervaloFollowupDias: number | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Canal *</label>
        <select
          name="canal"
          required
          defaultValue="whatsapp"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="whatsapp">WhatsApp</option>
          <option value="ligacao">Ligação</option>
          <option value="email">E-mail</option>
          <option value="presencial">Presencial</option>
          <option value="outro">Outro</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Próximo follow-up *
        </label>
        <input
          name="proximo_followup"
          type="date"
          required
          defaultValue={suggestedNextDate(intervaloFollowupDias)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Resumo *</label>
        <textarea
          name="resumo"
          required
          rows={2}
          placeholder="O que foi falado?"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
    </div>
  );
}
