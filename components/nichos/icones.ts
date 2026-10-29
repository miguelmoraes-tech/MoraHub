import {
  Briefcase,
  Building2,
  GraduationCap,
  HardHat,
  HeartPulse,
  Scale,
  Store,
} from "lucide-react";

type Icone = React.ComponentType<{ className?: string }>;

// Ícone de cada nicho (nichos.icone = nome do lucide). Nicho com ícone que não
// está aqui cai no genérico: acrescentar uma linha quando criar um nicho novo.
const ICONES_NICHO: Record<string, Icone> = {
  briefcase: Briefcase,
  "heart-pulse": HeartPulse,
  scale: Scale,
  "hard-hat": HardHat,
  "graduation-cap": GraduationCap,
  store: Store,
};

export function iconeDoNicho(nome: string | null | undefined): Icone {
  return (nome && ICONES_NICHO[nome]) || Building2;
}
