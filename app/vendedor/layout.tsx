import { requireVendedor } from "@/lib/vendedor";
import { VendedorSidebar } from "@/components/vendedor/vendedor-sidebar";
import { ToastProvider } from "@/components/toast";

export default async function VendedorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The proxy already keeps vendedores in this area; this is the other half:
  // nobody who isn't an active 'comercial' member gets past here.
  const ctx = await requireVendedor();

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden">
        <VendedorSidebar userEmail={ctx.email} />
        <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </ToastProvider>
  );
}
