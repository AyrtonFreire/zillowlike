"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Home, BadgeCheck, Users, MessageCircle, Handshake, Megaphone, MapPin, Calendar } from "lucide-react";

type Tab = "imovel" | "corretor" | "cliente";

export default function MatchFlowSection() {
  const [tab, setTab] = useState<Tab>("imovel");

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">Como acontece o match perfeito</h2>
        <p className="mt-2 text-gray-600">Imóvel, corretor e cliente se conectam com leveza. Sem competição, só conexão.</p>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-white ring-1 ring-gray-200 shadow-lg">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <motion.div className="absolute -top-24 -left-24 h-60 w-60 rounded-full bg-blue-500/10 blur-3xl" animate={{ y: [0, 10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div className="absolute -bottom-24 -right-24 h-60 w-60 rounded-full bg-purple-500/10 blur-3xl" animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} />
        </div>

        <div className="relative z-10 p-6 sm:p-10">
          <div className="flex flex-col md:flex-row items-stretch gap-6">
            <Card
              active={tab === "imovel"}
              onClick={() => setTab("imovel")}
              icon={<Home className="w-5 h-5" />}
              title="Imóvel"
              bullets={["Anúncio completo em minutos", "Destaque visual nas buscas", "Filtros que valorizam seus diferenciais"]}
            >
              <IllustrationImovel />
              <FlowDetails
                visible={tab === "imovel"}
                lines={["Você posta com fotos e informações essenciais.", "Nosso algoritmo apresenta seu anúncio para quem busca algo como o seu."]}
              />
            </Card>

            <Card
              active={tab === "corretor"}
              onClick={() => setTab("corretor")}
              icon={<BadgeCheck className="w-5 h-5" />}
              title="Corretor"
              bullets={["Corretores verificados", "Fila justa e sem pressão", "Ferramentas que ajudam, não obrigam"]}
            >
              <IllustrationCorretor />
              <FlowDetails
                visible={tab === "corretor"}
                lines={["Corretores entram na fila por afinidade.", "Quem estiver disponível e alinhado assume o contato com o cliente."]}
              />
            </Card>

            <Card
              active={tab === "cliente"}
              onClick={() => setTab("cliente")}
              icon={<Users className="w-5 h-5" />}
              title="Cliente"
              bullets={["Contato direto e qualificado", "Agendamento sem atritos", "Transparência em todo o caminho"]}
            >
              <IllustrationCliente />
              <FlowDetails
                visible={tab === "cliente"}
                lines={["Cliente encontra, pergunta e agenda visita.", "Sem leilão, sem disputa: apenas a conexão certa."]}
              />
            </Card>
          </div>

          <div className="mt-10">
            <MotionConnector tab={tab} />
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
            <Pill icon={<MessageCircle className="w-4 h-4" />}>Mensagens diretas e claras</Pill>
            <Pill icon={<Handshake className="w-4 h-4" />}>Conexão sem competição</Pill>
            <Pill icon={<BadgeCheck className="w-4 h-4" />}>Corretores verificados</Pill>
          </div>

          <div className="mt-8 flex items-center justify-center">
            <a
              href="/owner/new"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow hover:shadow-md"
            >
              <Megaphone className="w-5 h-5" />
              Anunciar agora
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Card({ active, onClick, icon, title, bullets, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; bullets: string[]; children: React.ReactNode }) {
  return (
    <motion.button
      onClick={onClick}
      className={`group relative flex-1 rounded-2xl border ${active ? "border-transparent" : "border-gray-200"} bg-white p-5 text-left shadow-sm focus:outline-none`}
      animate={{ scale: active ? 1.02 : 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      whileHover={{ y: -2 }}
      aria-pressed={active}
    >
      <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 ${active ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white" : "bg-gray-100 text-gray-800"}`}>
        {icon}
        <span className="font-semibold">{title}</span>
      </div>
      {/* Illustration area */}
      <div className="mt-3">
        {children && (
          <div className="mb-3">
            {/* children may include illustration and details */}
          </div>
        )}
      </div>
      <ul className="mt-3 space-y-1 text-gray-700 text-sm">
        {bullets.map((b, i) => (
          <li key={i} className="leading-relaxed">{b}</li>
        ))}
      </ul>
      <AnimatePresence initial={false}>{children}</AnimatePresence>
    </motion.button>
  );
}

function FlowDetails({ visible, lines }: { visible: boolean; lines: string[] }) {
  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: "auto", marginTop: 12 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          transition={{ duration: 0.35 }}
          className="text-sm text-gray-600"
        >
          <div className="mt-2 space-y-1">
            {lines.map((t, i) => (
              <motion.p key={i} initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.25, delay: 0.05 * i }}>
                {t}
              </motion.p>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MotionConnector({ tab }: { tab: Tab }) {
  const target = { imovel: 0.15, corretor: 0.5, cliente: 0.85 }[tab];
  return (
    <motion.svg viewBox="0 0 1000 160" className="w-full" initial={false}>
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <motion.path d="M40 90 C 240 10, 760 170, 960 70" fill="none" stroke="url(#g)" strokeWidth="6" strokeLinecap="round" initial={{ pathLength: 0.6 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
      {/* Moving dot */}
      <motion.circle r="9" fill="#7C3AED" initial={false} animate={{ cx: 40 + 920 * target, cy: 90 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} />
      {/* Contextual floating icons */}
      <FloatingIcon x={160} y={40} active={tab === "imovel"}><Home className="w-4 h-4" /></FloatingIcon>
      <FloatingIcon x={500} y={120} active={tab === "corretor"}><BadgeCheck className="w-4 h-4" /></FloatingIcon>
      <FloatingIcon x={840} y={50} active={tab === "cliente"}><Users className="w-4 h-4" /></FloatingIcon>
      <FloatingIcon x={320} y={70} active={tab === "imovel"}><MapPin className="w-4 h-4" /></FloatingIcon>
      <FloatingIcon x={680} y={60} active={tab === "corretor"}><Handshake className="w-4 h-4" /></FloatingIcon>
      <FloatingIcon x={900} y={110} active={tab === "cliente"}><Calendar className="w-4 h-4" /></FloatingIcon>
    </motion.svg>
  );
}

function FloatingIcon({ x, y, active, children }: { x: number; y: number; active: boolean; children: React.ReactNode }) {
  return (
    <motion.g initial={false} animate={{ opacity: active ? 1 : 0.35 }}>
      <motion.circle cx={x} cy={y} r={12} fill="rgba(124,58,237,0.08)" />
      <motion.foreignObject x={x - 8} y={y - 8} width={16} height={16}>
        <div className="text-purple-600">{children}</div>
      </motion.foreignObject>
    </motion.g>
  );
}

function Pill({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">
      {icon}
      <span>{children}</span>
    </div>
  );
}

// Simple per-card motion SVG illustrations
function IllustrationImovel() {
  return (
    <motion.svg viewBox="0 0 260 90" className="w-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <defs>
        <linearGradient id="gi" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <motion.rect x="10" y="20" width="120" height="60" rx="10" fill="url(#gi)" opacity="0.15" />
      <motion.rect x="140" y="10" width="100" height="40" rx="10" fill="url(#gi)" opacity="0.12" />
      <motion.circle cx="70" cy="50" r="10" fill="#7C3AED" animate={{ r: [9, 11, 9] }} transition={{ duration: 2, repeat: Infinity }} />
    </motion.svg>
  );
}

function IllustrationCorretor() {
  return (
    <motion.svg viewBox="0 0 260 90" className="w-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <defs>
        <linearGradient id="gc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <motion.path d="M20 70 C 80 10, 180 110, 240 50" stroke="url(#gc)" strokeWidth="6" fill="none" strokeLinecap="round" initial={{ pathLength: 0.3 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
      <motion.circle cx="120" cy="40" r="8" fill="#2563EB" animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity }} />
    </motion.svg>
  );
}

function IllustrationCliente() {
  return (
    <motion.svg viewBox="0 0 260 90" className="w-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <defs>
        <linearGradient id="gl" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <motion.rect x="30" y="25" width="80" height="40" rx="8" fill="url(#gl)" opacity="0.14" />
      <motion.rect x="130" y="35" width="100" height="30" rx="8" fill="url(#gl)" opacity="0.14" />
      <motion.circle cx="200" cy="30" r="6" fill="#7C3AED" animate={{ x: [0, 5, 0] }} transition={{ duration: 2, repeat: Infinity }} />
    </motion.svg>
  );
}
