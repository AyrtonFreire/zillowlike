"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { track } from "@/lib/analytics";

export default function StickyActions({
  priceCents,
  scheduleHref,
  phone,
  whatsapp,
  onMessage,
  financingHint,
}: {
  priceCents: number;
  scheduleHref: string;
  phone?: string | null;
  whatsapp?: string | null;
  onMessage?: () => void;
  financingHint?: { perMonth: number; lender?: string; rateLabel?: string } | null;
}) {
  const priceBRL = (priceCents / 100).toLocaleString("pt-BR");
  return (
    <div className="sticky top-24 space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur p-5 shadow-xl">
        <div className="mb-4">
          <div className="text-sm text-gray-500">Preço</div>
          <div className="text-3xl font-extrabold tracking-tight text-gray-900">R$ {priceBRL}</div>
        </div>
        <motion.div whileTap={{ scale: 0.98 }}>
          <Link prefetch={false} href={scheduleHref} aria-label="Agendar visita" onClick={() => { try { track({ name: 'filters_apply', payload: { action: 'schedule_visit' } }); } catch {} }}>
            <Button className="w-full bg-gradient-to-r glass-teal hover:bg-blue-700">
              Agendar Visita
            </Button>
          </Link>
        </motion.div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {phone && (
            <a aria-label="Ligar agora" href={`tel:${phone}`} onClick={() => { try { track({ name: 'filters_apply', payload: { action: 'call_now' } }); } catch {} }}>
              <Button variant="ghost" className="w-full border">
                Ligar Agora
              </Button>
            </a>
          )}
          {whatsapp && (
            <a aria-label="WhatsApp" target="_blank" href={`https://wa.me/${whatsapp}`} onClick={() => { try { track({ name: 'filters_apply', payload: { action: 'whatsapp' } }); } catch {} }}>
              <Button variant="ghost" className="w-full border">WhatsApp</Button>
            </a>
          )}
          {!whatsapp && !phone && (
            <Button aria-label="Enviar mensagem" onClick={() => { try { track({ name: 'filters_apply', payload: { action: 'send_message' } }); } catch {} onMessage?.(); }} variant="ghost" className="col-span-2 border">
              Enviar Mensagem
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow">
        <div className="text-sm font-semibold text-blue-800 mb-1">Financiamento</div>
        {financingHint ? (
          <div className="mb-2">
            <div className="text-sm text-gray-600">Parcelas a partir de</div>
            <div className="text-2xl font-extrabold text-blue-700">R$ {financingHint.perMonth.toLocaleString("pt-BR")}/mês</div>
            <div className="text-xs text-blue-700/80">{financingHint.lender || "Banco"}{financingHint.rateLabel ? ` · ${financingHint.rateLabel}` : ""}</div>
          </div>
        ) : null}
        <Link prefetch={false} href="#financing" onClick={() => { try { track({ name: 'filters_apply', payload: { action: 'simulate_financing' } }); } catch {} }} className="text-sm font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1">
          Simular financiamento
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
        </Link>
      </div>
    </div>
  );
}
