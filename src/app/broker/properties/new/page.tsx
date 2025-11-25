import { redirect } from "next/navigation";

/**
 * Redireciona para a página de criação de imóvel unificada.
 * A página /owner/new funciona para qualquer role (OWNER, REALTOR, USER)
 * e vincula o imóvel ao usuário logado.
 */
export default function BrokerNewPropertyPage() {
  redirect("/owner/new");
}
