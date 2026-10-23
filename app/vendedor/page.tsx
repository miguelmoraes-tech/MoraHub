import { redirect } from "next/navigation";
import { VENDEDOR_HOME } from "@/lib/vendedor-access";

export default function VendedorIndexPage() {
  redirect(VENDEDOR_HOME);
}
