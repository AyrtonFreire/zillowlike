"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, FileText, Users, Rocket, PlayCircle, Camera, Image as ImageIcon, Lightbulb, Handshake, Mail, Phone, Globe, Upload, MapPin } from "lucide-react";
import Link from "next/link";

export default function HowItWorksPostCard() {
  const [expanded, setExpanded] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [dir, setDir] = useState<1 | -1>(1);

  const goOpen = () => { setExpanded(true); setStep(0); };
  const goClose = () => { setExpanded(false); };
  const next = () => { setDir(1); setStep((s) => (Math.min(3, s + 1) as 0 | 1 | 2 | 3)); };
  const prev = () => { setDir(-1); setStep((s) => (Math.max(0, s - 1) as 0 | 1 | 2 | 3)); };

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="relative overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-gray-200">
        {/* Gradientes sutis (emerald/stone) */}
        <div className="pointer-events-none absolute -top-32 -right-32 h-64 w-64 rounded-full bg-teal-light/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-teal/10 blur-3xl" />

        {/* Compacto por padrão */}
        <AnimatePresence initial={false} mode="wait">
          {!expanded && (
            <motion.div
              key="compact"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="relative z-10 p-6 sm:p-10"
            >
              <div className="flex items-center justify-between gap-6">
                <div className="flex-1">
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
                    Postar é simples. Veja como funciona
                  </h2>
                  <p className="mt-2 text-gray-600 max-w-xl text-sm">
                    Publique seu imóvel em minutos, receba contatos verificados e tenha máxima exposição. Sem pressão, sem complicação.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={goOpen}
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white glass-teal focus:outline-none focus:ring-2 focus:ring-teal-light"
                    >
                      <PlayCircle className="w-5 h-5" />
                      Veja como é fácil
                    </button>
                    <Link href="/owner/new" className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold border border-gray-300 text-gray-800 bg-white hover:bg-gray-50">
                      Anunciar agora
                    </Link>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">Alcance máximo</span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">Sem taxas escondidas</span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">Ferramentas úteis</span>
                  </div>
                </div>

                {/* Gráfico minimalista no compacto */}
                <div className="hidden md:flex items-center justify-center w-[280px]">
                  <motion.svg width="240" height="120" viewBox="0 0 360 220" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#059669" />
                        <stop offset="100%" stopColor="#047857" />
                      </linearGradient>
                    </defs>
                    <motion.path d="M20 180 C 120 80, 240 280, 340 120" fill="none" stroke="url(#grad)" strokeWidth="6" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
                    <motion.circle r="6" fill="#059669" initial={{ cx: 20, cy: 180 }} animate={{ cx: 300, cy: 120 }} transition={{ duration: 1.2, repeat: Infinity, repeatType: "reverse" }} />
                  </motion.svg>
                </div>
              </div>
            </motion.div>
          )}

          {/* Expandido: storyboard de 4 cenas com transição horizontal */}
          {expanded && (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="relative z-10 p-6 sm:p-10"
            >
              <div className="flex items-start justify-between">
                <div className="text-xs text-gray-500">Cena {step + 1} de 4</div>
                <button onClick={goClose} className="text-sm text-gray-600 hover:text-gray-800">Fechar</button>
              </div>

              <div className="mt-4">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={step} initial={{ x: dir === 1 ? 40 : -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: dir === 1 ? -40 : 40, opacity: 0 }} transition={{ duration: 0.35 }}>
                    {step === 0 && (
                      <SceneUpload />
                    )}
                    {step === 1 && (
                      <SceneDetails />
                    )}
                    {step === 2 && (
                      <SceneContact />
                    )}
                    {step === 3 && (
                      <SceneExposure />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navegação */}
              <div className="mt-6 flex items-center justify-between">
                <button onClick={prev} disabled={step === 0} className={`px-4 py-2 rounded-lg border text-sm ${step === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"}`}>Anterior</button>
                <div className="flex items-center gap-2">
                  {[0,1,2,3].map((i) => (
                    <span key={i} className={`h-2 w-2 rounded-full ${i === step ? "bg-teal" : "bg-gray-300"}`} />
                  ))}
                </div>
                <button onClick={next} disabled={step === 3} className={`px-4 py-2 rounded-lg text-sm text-white ${step === 3 ? "opacity-40 cursor-not-allowed bg-teal" : "glass-teal"}`}>{step === 3 ? "Concluído" : "Próximo"}</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

// Scenes
function SceneUpload() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div>
        <div className="text-xl font-bold text-gray-900">Upload de fotos com dicas</div>
        <p className="text-gray-600 mt-1 text-sm">Arraste suas fotos, ordene e melhore o anúncio com dicas rápidas.</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-lg bg-teal/5 border border-gray-100" />
          ))}
        </div>
        <div className="mt-3 inline-flex items-center gap-2 text-sm text-gray-600"><Upload className="w-4 h-4" /> Arraste e solte ou clique para enviar</div>
      </div>
      <div>
        <div className="rounded-xl border p-4">
          <div className="text-sm font-medium text-gray-800 mb-2">Dicas contextuais</div>
          <Tips items={[
            { icon: <Camera className="w-4 h-4" />, text: "Use luz natural, evite contraluz." },
            { icon: <ImageIcon className="w-4 h-4" />, text: "Horizontais, ambiente organizado." },
            { icon: <Lightbulb className="w-4 h-4" />, text: "Destaque diferenciais (varanda, suíte)." },
          ]} />
        </div>
      </div>
    </div>
  );
}

function SceneDetails() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="rounded-xl border p-4">
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
        <PropertyPreview />
      </div>
    </div>
  );
}

function SceneContact() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div>
        <div className="text-xl font-bold text-gray-900">Como quer ser contatado?</div>
        <p className="text-gray-600 mt-1 text-sm">Contato direto ou conexão com corretor disponível. Sem disputa, só conexão.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <OptionCard title="Contato direto" points={["Interessados falam com você","Você combina a visita","Sem intermediação"]} icon={<Mail className="w-4 h-4" />} />
          <OptionCard title="Com apoio do corretor" points={["Conectamos ao corretor disponível","Profissional acompanha a visita","Menos trabalho para você"]} icon={<Phone className="w-4 h-4" />} />
        </div>
      </div>
      <div className="rounded-xl border p-4">
        <div className="text-sm font-medium text-gray-800 mb-2">Como o match acontece</div>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Cliente demonstra interesse no seu anúncio</li>
          <li>• Sistema identifica corretor disponível e alinhado</li>
          <li>• Visita é combinada sem leilão e sem pressão</li>
        </ul>
      </div>
    </div>
  );
}

function SceneExposure() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div>
        <div className="text-xl font-bold text-gray-900">Máxima exposição</div>
        <p className="text-gray-600 mt-1 text-sm">Seu imóvel visto por usuários, corretores e imobiliárias — sem gastar com divulgação externa.</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (<PropertyPreview key={i} compact />))}
        </div>
      </div>
      <div className="rounded-xl border p-4">
        <div className="text-sm text-gray-600 mb-2">Mapa</div>
        <div className="aspect-[4/3] rounded-lg bg-teal/5 flex items-center justify-center">
          <MapPin className="w-6 h-6 text-teal" />
        </div>
        <div className="mt-5">
          <Link href="/owner/new" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white glass-teal"><Rocket className="w-5 h-5" /> Começar anúncio agora</Link>
        </div>
      </div>
    </div>
  );
}

function PropertyPreview({ compact }: { compact?: boolean }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white ${compact ? 'p-3' : 'p-4'} shadow-sm`}>
      <div className={`w-full ${compact ? 'h-20' : 'h-36'} rounded-lg bg-gray-100 mb-3`} />
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
      <div className="flex gap-2">
        <span className="h-5 w-12 bg-gray-100 rounded"></span>
        <span className="h-5 w-16 bg-gray-100 rounded"></span>
        <span className="h-5 w-10 bg-gray-100 rounded"></span>
      </div>
    </div>
  );
}

// Simple Field used for mocks
function Field({ label, long }: { label: string; long?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`rounded-md border border-gray-200 ${long ? 'h-20' : 'h-9'} bg-white`}></div>
    </div>
  );
}

function Tips({ items }: { items: { icon: React.ReactNode; text: string }[] }) {
  return (
    <ul className="text-sm text-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="text-teal mt-0.5">{it.icon}</span>
          <span>{it.text}</span>
        </li>
      ))}
    </ul>
  );
}

function OptionCard({ title, points, icon }: { title: string; points: string[]; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1 text-gray-800">
        {icon}
        <span className="font-medium text-sm">{title}</span>
      </div>
      <ul className="mt-2 text-sm text-gray-700 space-y-1">
        {points.map((p, i) => (<li key={i}>• {p}</li>))}
      </ul>
    </div>
  );
}
