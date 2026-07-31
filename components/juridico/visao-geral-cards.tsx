import { StatCard } from "@/components/stat-card";

type StatCardTone = "zinc" | "emerald" | "rose" | "amber" | "copper";

export interface VisaoGeralCard {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: StatCardTone;
  href?: string;
}

export function VisaoGeralCards({ cards }: { cards: VisaoGeralCard[] }) {
  if (cards.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="mb-3 text-sm font-semibold text-zinc-100">Visão Geral</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <StatCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            value={card.value}
            hint={card.hint}
            tone={card.tone}
            href={card.href}
          />
        ))}
      </div>
    </div>
  );
}
