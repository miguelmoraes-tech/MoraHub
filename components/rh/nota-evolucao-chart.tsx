import { formatDate } from "@/lib/format";

const WIDTH = 320;
const HEIGHT = 96;
const PADDING_X = 12;
const PADDING_TOP = 18;
const PADDING_BOTTOM = 20;

function notaY(nota: number) {
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  return PADDING_TOP + plotHeight * (1 - nota / 10);
}

export function NotaEvolucaoChart({
  pontos,
}: {
  pontos: { periodo_referencia: string; nota: number }[];
}) {
  if (pontos.length < 2) return null;

  const plotWidth = WIDTH - PADDING_X * 2;
  const step = plotWidth / (pontos.length - 1);
  const coords = pontos.map((p, i) => ({
    x: PADDING_X + step * i,
    y: notaY(p.nota),
    nota: p.nota,
    data: p.periodo_referencia,
  }));
  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-24 w-full max-w-xs"
      role="img"
      aria-label="Evolução da nota de desempenho ao longo do tempo"
    >
      <line
        x1={PADDING_X}
        y1={HEIGHT - PADDING_BOTTOM}
        x2={WIDTH - PADDING_X}
        y2={HEIGHT - PADDING_BOTTOM}
        stroke="currentColor"
        className="text-zinc-800"
        strokeWidth={1}
      />
      <path d={linePath} fill="none" stroke="#e0873f" strokeWidth={2} strokeLinejoin="round" />
      {coords.map((c, i) => (
        <g key={pontos[i].periodo_referencia}>
          <circle cx={c.x} cy={c.y} r={4} fill="#e0873f" />
          <text
            x={c.x}
            y={c.y - 8}
            textAnchor="middle"
            className="fill-zinc-300"
            style={{ fontSize: 9 }}
          >
            {c.nota}
          </text>
          <text
            x={c.x}
            y={HEIGHT - 6}
            textAnchor="middle"
            className="fill-zinc-600"
            style={{ fontSize: 8 }}
          >
            {formatDate(c.data).slice(3)}
          </text>
        </g>
      ))}
    </svg>
  );
}
