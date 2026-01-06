"use client";

import { useMemo, useState } from "react";
import { User, Building2, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M19.11 17.29c-.28-.14-1.67-.82-1.93-.92-.26-.09-.45-.14-.64.14-.19.28-.74.92-.91 1.11-.17.19-.33.21-.61.07-.28-.14-1.18-.43-2.25-1.38-.83-.74-1.39-1.65-1.56-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.33.42-.5.14-.17.19-.28.28-.47.09-.19.05-.36-.02-.5-.07-.14-.64-1.54-.88-2.11-.23-.55-.46-.48-.64-.49h-.55c-.19 0-.5.07-.76.36-.26.28-1 1-1 2.43 0 1.43 1.02 2.81 1.16 3 .14.19 2.01 3.07 4.87 4.31.68.29 1.2.46 1.61.59.68.21 1.29.18 1.78.11.54-.08 1.67-.68 1.9-1.34.24-.66.24-1.22.17-1.34-.07-.12-.26-.19-.54-.33z"
      />
      <path
        fill="currentColor"
        d="M16.02 3C9.39 3 4 8.39 4 15.02c0 2.1.55 4.16 1.6 5.98L4 29l8.2-1.55c1.76.96 3.75 1.47 5.82 1.47 6.63 0 12.02-5.39 12.02-12.02C30.04 8.39 22.65 3 16.02 3zm0 23.7c-1.88 0-3.71-.5-5.31-1.44l-.38-.22-4.87.92.92-4.75-.25-.4a10.64 10.64 0 0 1-1.63-5.79c0-5.88 4.78-10.66 10.66-10.66 5.88 0 10.66 4.78 10.66 10.66 0 5.88-4.78 10.68-10.66 10.68z"
      />
    </svg>
  );
}

type ContactCardProps = {
  propertyId: string;
  propertyTitle: string;
  propertyPurpose?: "SALE" | "RENT";
  
  // Owner/Realtor info
  ownerRole: "USER" | "OWNER" | "REALTOR" | "AGENCY" | "ADMIN";
  ownerName?: string;
  ownerImage?: string;
  ownerPhone?: string;
  ownerPublicProfileEnabled?: boolean;
  ownerPublicSlug?: string | null;
  ownerPublicPhoneOptIn?: boolean;
  hideOwnerContact?: boolean;
  
  // Contact settings
};

export default function PropertyContactCard({
  propertyId,
  propertyTitle,
  ownerRole,
  ownerName,
  ownerImage,
  ownerPublicProfileEnabled,
  ownerPublicSlug,
  ownerPublicPhoneOptIn,
  hideOwnerContact,
}: ContactCardProps) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { data: session } = useSession();
  const router = useRouter();

  const isAuthenticated = !!session;

  // Determinar cenário
  const isRealtorOrAgency = ownerRole === "REALTOR" || ownerRole === "AGENCY";
  const hasPublicProfile =
    (isRealtorOrAgency && !!ownerPublicSlug) ||
    (!isRealtorOrAgency && !!ownerPublicProfileEnabled && !!ownerPublicSlug);

  const canShowWhatsApp = useMemo(() => {
    // Para corretores/imobiliárias: se houver opt-in no perfil, respeita; caso contrário, esconde.
    if (isRealtorOrAgency) return !!ownerPublicPhoneOptIn;
    if (hideOwnerContact) return false;
    // Para pessoa física: o controle é por imóvel (hideOwnerContact).
    return true;
  }, [hideOwnerContact, isRealtorOrAgency, ownerPublicPhoneOptIn]);

  const handleWhatsAppClick = async () => {
    try {
      if (!canShowWhatsApp) {
        toast.info("Contato via WhatsApp não está disponível para este anúncio.");
        return;
      }

      const tryFetch = async (method: "GET" | "POST") => {
        const res = await fetch(`/api/properties/${propertyId}/whatsapp`, { method });
        const data = await res.json().catch(() => ({} as any));
        const url = data?.whatsappUrl as string | undefined;
        return { ok: res.ok, url };
      };

      const primary = await tryFetch("POST");
      const fallback = primary.ok && primary.url ? primary : await tryFetch("GET");

      if (!fallback.ok || !fallback.url) {
        toast.error("WhatsApp indisponível no momento.");
        return;
      }

      window.open(fallback.url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("WhatsApp indisponível no momento.");
    }
  };

  const getChatCallbackUrl = () => {
    return `/chats?openChat=1&propertyId=${encodeURIComponent(propertyId)}&direct=1`;
  };

  const createLeadAndOpenChat = async () => {
    try {
      if (!isAuthenticated) {
        await signIn(undefined, { callbackUrl: getChatCallbackUrl() });
        return;
      }

      const s: any = session as any;
      const name = String(s?.user?.name || s?.user?.fullName || "").trim();
      const email = String(s?.user?.email || "").trim();
      if (!name || name.length < 2 || !email) {
        toast.error("Para usar o chat, complete seu nome e e-mail na sua conta.");
        return;
      }

      setLoading(true);

      const payload: any = {
        propertyId,
        name,
        email,
        phone: String(s?.user?.phone || "").trim() || undefined,
        isDirect: true,
      };

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          data?.error ||
          (res.status === 429
            ? "Muitas tentativas. Tente novamente em alguns instantes."
            : "Não conseguimos abrir o chat agora.");
        throw new Error(msg);
      }

      const leadId = String(data?.leadId || "");
      if (!leadId) {
        throw new Error("Não conseguimos abrir o chat agora.");
      }

      router.push(`/chats?lead=${encodeURIComponent(leadId)}`);
    } catch (err: any) {
      toast.error(err?.message || "Não conseguimos abrir o chat agora.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-teal/10 p-6 bg-white shadow-sm">
      {/* Header: foto/logo do corretor/imobiliária (se aplicável) */}
      {isRealtorOrAgency && ownerName && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          {hasPublicProfile ? (
            <Link
              href={`/realtor/${ownerPublicSlug}`}
              className="flex items-center gap-3 rounded-lg -mx-1 px-1 hover:bg-teal/5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-light focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              {ownerImage ? (
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-teal/20">
                  <Image src={ownerImage} alt={ownerName} fill className="object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal/20 to-teal/40 flex items-center justify-center">
                  {ownerRole === "AGENCY" ? (
                    <Building2 className="w-8 h-8 text-teal" />
                  ) : (
                    <User className="w-8 h-8 text-teal" />
                  )}
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900">{ownerName}</p>
                <p className="text-sm text-gray-600">
                  {ownerRole === "AGENCY" ? "Imobiliária" : "Corretor"}
                </p>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              {ownerImage ? (
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-teal/20">
                  <Image src={ownerImage} alt={ownerName} fill className="object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal/20 to-teal/40 flex items-center justify-center">
                  {ownerRole === "AGENCY" ? (
                    <Building2 className="w-8 h-8 text-teal" />
                  ) : (
                    <User className="w-8 h-8 text-teal" />
                  )}
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900">{ownerName}</p>
                <p className="text-sm text-gray-600">
                  {ownerRole === "AGENCY" ? "Imobiliária" : "Corretor"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
        <h3 className="text-lg font-semibold text-gray-900">Fale diretamente com o Anunciante</h3>

        <div className="mt-3">
          <button
            type="button"
            onClick={handleWhatsAppClick}
            disabled={!canShowWhatsApp}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] text-white text-base font-semibold px-4 py-3 shadow-sm hover:bg-[#128C7E] active:brightness-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60"
          >
            <WhatsAppIcon className="w-5 h-5" />
            WhatsApp
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-semibold text-gray-500">Ou</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="mt-4">
          <p className="text-sm font-semibold text-gray-900">Use nosso chat</p>
          <p className="text-xs text-gray-600 mt-1">Envie mensagens e acompanhe a conversa aqui no site.</p>
          <button
            type="button"
            onClick={createLeadAndOpenChat}
            disabled={loading}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 text-white text-base font-semibold px-4 py-3 shadow-sm hover:bg-teal-700 active:brightness-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60"
          >
            <MessageCircle className="w-5 h-5" />
            {loading ? "Abrindo..." : "Chat"}
          </button>
        </div>
      </div>
    </div>
  );

}
