"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Camera, Image as ImageIcon, Lightbulb, Mail, Phone, MapPin, Rocket } from "lucide-react";

const STORAGE_KEY = "microtour_seen_v1";

export default function Microtour() {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [dir, setDir] = useState<1 | -1>(1);

  useEffect(() => {
    const v = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    setSeen(!!v);
  }, []);

  // Intercept clicks to /owner/new to show microtour first when not seen
  useEffect(() => {
    const handler = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest('a[href="/owner/new"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (!seen) {
        e.preventDefault();
        setOpen(true);
        setStep(0);
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [seen]);

  const next = useCallback(() => {
    setDir(1);
    setStep((s) => (Math.min(2, s + 1) as 0 | 1 | 2));
  }, []);
  const prev = useCallback(() => {
    setDir(-1);
    setStep((s) => (Math.max(0, s - 1) as 0 | 1 | 2));
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const markSeen = useCallback(() => {
    try { window.localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setSeen(true);
  }, []);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-microtour", handler as EventListener);
    return () => window.removeEventListener("open-microtour", handler as EventListener);
  }, []);

  return (
    <>
      {!seen && (
        <button
          onClick={() => { setOpen(true); setStep(0); }}
          className="fixed z-40 bottom-6 right-6 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow-2xl hover:shadow-[0_10px_30px_rgba(124,58,237,0.35)] backdrop-blur"
        >
          Veja como é fácil
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={close} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.98, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-3xl rounded-3xl bg-white/90 backdrop-blur-md shadow-[0_20px_60px_rgba(16,24,40,0.25)] ring-1 ring-white/40 overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b">
                  <div className="text-sm text-gray-500">Passo {step + 1} de 3</div>
                  <button onClick={close} className="text-sm text-gray-600 hover:text-gray-900">Fechar</button>
                </div>

                <div className="p-5 sm:p-6">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={step} initial={{ x: dir === 1 ? 40 : -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: dir === 1 ? -40 : 40, opacity: 0 }} transition={{ duration: 0.25 }}>
                      {step === 0 && <StepFotos />}
                      {step === 1 && <StepDetalhes />}
                      {step === 2 && <StepContatoExposicao />}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="px-5 sm:px-6 pb-5 sm:pb-6 flex items-center justify-between">
                  <button onClick={prev} disabled={step === 0} className={`px-4 py-2 rounded-lg border text-sm ${step === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"}`}>Anterior</button>
                  <div className="flex items-center gap-2">
                    {[0,1,2].map((i) => (
                      <span key={i} className={`h-2 w-2 rounded-full ${i === step ? "bg-purple-600" : "bg-gray-300"}`} />
                    ))}
                  </div>
                  {step < 2 ? (
                    <button onClick={next} className="px-4 py-2 rounded-lg text-sm text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-95">Próximo</button>
                  ) : (
                    <Link href="/owner/new" onClick={markSeen} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-95">
                      <Rocket className="w-4 h-4" /> Começar anúncio
                    </Link>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function StepFotos() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div>
        <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">Fotos que encantam</div>
        <p className="text-gray-600 text-sm mt-1">Use luz natural e organize os ambientes. Isso aumenta o interesse no seu anúncio.</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (<div key={i} className="aspect-[4/3] rounded-lg bg-gradient-to-tr from-blue-50 to-purple-50 border border-gray-100" />))}
        </div>
      </div>
      <div className="rounded-xl border p-4 bg-white/70 backdrop-blur">
        <div className="text-sm font-medium text-gray-800 mb-2">Dicas rápidas</div>
        <ul className="text-sm text-gray-700 space-y-2">
          <li className="flex items-start gap-2"><Camera className="w-4 h-4 text-purple-600" /> Aproveite a luz da janela e evite contraluz.</li>
          <li className="flex items-start gap-2"><ImageIcon className="w-4 h-4 text-purple-600" /> Fotografe na horizontal e mostre o ambiente inteiro.</li>
          <li className="flex items-start gap-2"><Lightbulb className="w-4 h-4 text-purple-600" /> Destaque diferenciais: varanda, suíte, vaga.</li>
        </ul>
      </div>
    </div>
  );
}

function StepDetalhes() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="rounded-xl border p-4 bg-white/70 backdrop-blur">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Título" />
          <Field label="Preço" />
          <Field label="Quartos" />
          <Field label="Banheiros" />
        </div>
        <div className="mt-3"><Field label="Descrição" long /></div>
      </div>
      <div>
        <div className="text-sm text-gray-600 mb-2">Pré-visualização do anúncio</div>
        <PreviewCard />
      </div>
    </div>
  );
}

function StepContatoExposicao() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div>
        <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">Contato do jeito que preferir</div>
        <p className="text-gray-600 text-sm mt-1">Direto com você ou com o apoio de um corretor verificado. Sem disputa, só conexão.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Option title="Contato direto" icon={<Mail className="w-4 h-4" />} bullets={["Interessados falam com você", "Você combina a visita"]} />
          <Option title="Com apoio do corretor" icon={<Phone className="w-4 h-4" />} bullets={["Conectamos ao corretor disponível", "Profissional acompanha a visita"]} />
        </div>
      </div>
      <div className="rounded-xl border p-4 bg-white/70 backdrop-blur">
        <div className="text-sm text-gray-600 mb-2">Alcance</div>
        <div className="aspect-[4/3] rounded-lg bg-gradient-to-tr from-blue-50 to-purple-50 flex items-center justify-center">
          <MapPin className="w-6 h-6 text-purple-600" />
        </div>
        <div className="text-xs text-gray-500 mt-2">Seu anúncio aparece para usuários, corretores e imobiliárias na região.</div>
      </div>
    </div>
  );
}

function Field({ label, long }: { label: string; long?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`rounded-md border border-gray-200 ${long ? 'h-20' : 'h-9'} bg-white`}></div>
    </div>
  );
}

function PreviewCard() {
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm w-full max-w-sm">
      <div className="h-36 bg-gray-100" />
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-gray-900">Título do imóvel</div>
          <div className="text-purple-700 font-bold">R$ 000.000</div>
        </div>
        <div className="mt-1 text-sm text-gray-600">Bairro • Cidade</div>
        <div className="mt-2 text-xs text-gray-500">2 quartos • 1 banheiro • 60 m²</div>
      </div>
    </div>
  );
}

function Option({ title, icon, bullets }: { title: string; icon: React.ReactNode; bullets: string[] }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1 text-gray-800">
        {icon}
        <span className="font-medium text-sm">{title}</span>
      </div>
      <ul className="mt-2 text-sm text-gray-700 space-y-1">
        {bullets.map((p, i) => (<li key={i}>• {p}</li>))}
      </ul>
    </div>
  );
}
