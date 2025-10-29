"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, FileText, Users, Rocket, PlayCircle, Camera, Image as ImageIcon, Lightbulb, Handshake, Mail, Phone, Globe } from "lucide-react";
import Link from "next/link";

export default function HowItWorksPostCard() {
  const [expanded, setExpanded] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2>(0);

  const goOpen = () => { setExpanded(true); setStep(0); };
  const goClose = () => { setExpanded(false); };
  const next = () => setStep((s) => (Math.min(2, s + 1) as 0 | 1 | 2));
  const prev = () => setStep((s) => (Math.max(0, s - 1) as 0 | 1 | 2));

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="relative overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-gray-200">
        {/* Gradients sutis */}
        <div className="pointer-events-none absolute -top-32 -right-32 h-64 w-64 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-tr from-purple-500/15 to-blue-500/15 blur-3xl" />

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
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        <stop offset="0%" stopColor="#2563EB" />
                        <stop offset="100%" stopColor="#7C3AED" />
                      </linearGradient>
                    </defs>
                    <motion.path d="M20 180 C 120 80, 240 280, 340 120" fill="none" stroke="url(#grad)" strokeWidth="6" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
                    <motion.circle r="6" fill="#7C3AED" initial={{ cx: 20, cy: 180 }} animate={{ cx: 300, cy: 120 }} transition={{ duration: 1.2, repeat: Infinity, repeatType: "reverse" }} />
                  </motion.svg>
                </div>
              </div>
            </motion.div>
          )}

          {/* Expandido: stepper de 3 páginas */}
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
                <div className="text-xs text-gray-500">Passo {step + 1} de 3</div>
                <button onClick={goClose} className="text-sm text-gray-600 hover:text-gray-800">Fechar</button>
              </div>

              <div className="mt-4">
                <AnimatePresence mode="wait" initial={false}>
                  {step === 0 && (
                    <StepPage key="step-0" title="Capriche no anúncio" subtitle="Fotos que encantam, informações que ajudam" icon={<Camera className="w-6 h-6" />}>
                      <Tips
                        items={[
                          { icon: <Camera className="w-4 h-4" />, text: "Iluminação natural e ambientes organizados." },
                          { icon: <ImageIcon className="w-4 h-4" />, text: "Fotos horizontais, resolução nítida." },
                          { icon: <Lightbulb className="w-4 h-4" />, text: "Destaque diferenciais: varanda, suíte, vaga." },
                        ]}
                      />
                      <p className="mt-3 text-sm text-gray-600">Em poucos minutos você adiciona fotos, descrição, preço e detalhes (quartos, banheiros, metragem). Publicou? Já aparece nas buscas.</p>
                    </StepPage>
                  )}
                  {step === 1 && (
                    <StepPage key="step-1" title="Escolha como quer ser contatado" subtitle="Contato direto ou match com corretor" icon={<Handshake className="w-6 h-6" />}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <OptionCard title="Contato direto" points={["Interessados falam com você", "Você combina a visita", "Sem intermediação"]} icon={<Mail className="w-4 h-4" />} />
                        <OptionCard title="Com apoio do corretor" points={["Nós conectamos o interessado ao corretor", "Profissional acompanha a visita", "Você tem menos trabalho"]} icon={<Phone className="w-4 h-4" />} />
                      </div>
                      <p className="mt-3 text-sm text-gray-600">Quando o cliente demonstra interesse, o sistema atribui um corretor disponível e alinhado para acompanhar a visita — sem competição, só conexão.</p>
                    </StepPage>
                  )}
                  {step === 2 && (
                    <StepPage key="step-2" title="Máxima exposição sem sair de casa" subtitle="Seu imóvel visto por quem importa" icon={<Globe className="w-6 h-6" />}>
                      <ul className="text-sm text-gray-700 list-disc ml-5 space-y-1">
                        <li>Visível para usuários, corretores e imobiliárias</li>
                        <li>Melhor posição nas buscas com conteúdo caprichado</li>
                        <li>Nenhuma despesa com impulsionamento externo</li>
                      </ul>
                      <div className="mt-5">
                        <Link href="/owner/new" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow hover:shadow-md">
                          <Rocket className="w-5 h-5" /> Começar anúncio agora
                        </Link>
                      </div>
                    </StepPage>
                  )}
                </AnimatePresence>
              </div>

              {/* Navegação */}
              <div className="mt-6 flex items-center justify-between">
                <button onClick={prev} disabled={step === 0} className={`px-4 py-2 rounded-lg border text-sm ${step === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"}`}>Anterior</button>
                <div className="flex items-center gap-2">
                  {[0,1,2].map((i) => (
                    <span key={i} className={`h-2 w-2 rounded-full ${i === step ? "bg-purple-600" : "bg-gray-300"}`} />
                  ))}
                </div>
                <button onClick={next} disabled={step === 2} className={`px-4 py-2 rounded-lg text-sm text-white ${step === 2 ? "opacity-40 cursor-not-allowed bg-gradient-to-r from-blue-600 to-purple-600" : "bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-95"}`}>{step === 2 ? "Concluído" : "Próximo"}</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function StepPage({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600/10 to-purple-600/10 text-blue-700 p-2">
        {icon}
        <span className="font-semibold">{title}</span>
      </div>
      <p className="mt-2 text-gray-600 text-sm">{subtitle}</p>
      <div className="mt-3">
        {children}
      </div>
    </motion.div>
  );
}

function Tips({ items }: { items: { icon: React.ReactNode; text: string }[] }) {
  return (
    <ul className="text-sm text-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="text-purple-600 mt-0.5">{it.icon}</span>
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
