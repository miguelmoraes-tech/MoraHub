import { getAcessoModulo } from "@/lib/empresa-ativa";
import { podeVerSalarios } from "@/lib/rh/salarios";
import { RhAcessoProvider } from "@/components/rh/salarios-context";

/**
 * RH por pessoa: uma só leitura do acesso para todas as telas do módulo.
 * Fundador/cofundador têm tudo; sócio/funcionário, o que a permissão deles
 * liberar (leitura ou edição) e o extra de salários. Só interface: cada página
 * e action confere de novo no servidor.
 */
export default async function RhLayout({ children }: { children: React.ReactNode }) {
  const acesso = await getAcessoModulo("rh");
  const podeEditar = acesso?.nivel === "edicao";

  return (
    <RhAcessoProvider verSalarios={acesso ? podeVerSalarios(acesso) : false} podeEditar={podeEditar}>
      {acesso && !podeEditar && (
        <p className="mx-auto mt-4 max-w-4xl px-6 text-xs text-zinc-500">
          Você tem acesso somente de leitura ao RH.
        </p>
      )}
      {children}
    </RhAcessoProvider>
  );
}
