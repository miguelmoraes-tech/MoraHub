import { Download } from "lucide-react";

export function ExportButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3.5 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
    >
      <Download className="h-4 w-4" />
      Exportar
    </a>
  );
}
