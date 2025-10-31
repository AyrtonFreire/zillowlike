"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Home, BadgeCheck, Users, MessageCircle, Handshake, Megaphone, MapPin, Calendar, Search, Camera, Image as ImageIcon, Upload, CheckCircle, Clock } from "lucide-react";

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
          <motion.div className="absolute -top-24 -left-24 h-60 w-60 rounded-full bg-teal-light/10 blur-3xl" animate={{ y: [0, 10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div className="absolute -bottom-24 -right-24 h-60 w-60 rounded-full bg-teal/10 blur-3xl" animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} />
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

          {/* Rich interactive panel */}
          <div className="mt-8">
            <InteractivePanel tab={tab} />
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
            <Pill icon={<MessageCircle className="w-4 h-4" />}>Mensagens diretas e claras</Pill>
            <Pill icon={<Handshake className="w-4 h-4" />}>Conexão sem competição</Pill>
            <Pill icon={<BadgeCheck className="w-4 h-4" />}>Corretores verificados</Pill>
          </div>

          <div className="mt-8 flex items-center justify-center">
            <a
              href="/owner/new"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white glass-teal"
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
      <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 ${active ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-800"}`}>
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
  // Timeline: Imóvel (card) -> Busca (lupa) -> Mapa (pin) -> Contato (chat/handshake)
  // Animate a progress line and a moving marker. Slight emphasis icon per current tab.
  const t = { imovel: 0.1, corretor: 0.55, cliente: 0.9 }[tab];
  const stations = [
    { x: 120, y: 90, icon: <Home className="w-4 h-4" /> },
    { x: 360, y: 90, icon: <Search className="w-4 h-4" /> },
    { x: 600, y: 90, icon: <MapPin className="w-4 h-4" /> },
    { x: 840, y: 90, icon: <MessageCircle className="w-4 h-4" /> },
  ];
  return (
    <motion.svg viewBox="0 0 1000 180" className="w-full" initial={false}>
      <defs>
        <linearGradient id="gbase" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#D4D4D8" />
          <stop offset="100%" stopColor="#E5E7EB" />
        </linearGradient>
        <linearGradient id="gprog" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>
      {/* Base path */}
      <path d="M80 90 C 240 40, 760 140, 920 90" fill="none" stroke="url(#gbase)" strokeWidth="8" strokeLinecap="round" />
      {/* Progress overlay */}
      <motion.path
        d="M80 90 C 240 40, 760 140, 920 90"
        fill="none"
        stroke="url(#gprog)"
        strokeWidth="8"
        strokeLinecap="round"
        initial={{ pathLength: 0.2 }}
        animate={{ pathLength: 0.98 }}
        transition={{ duration: 1.2 }}
      />
      {/* Marker moves to reflect current tab emphasis */}
      <motion.circle r="10" fill="#059669" initial={false} animate={{ cx: 80 + 840 * t, cy: 90 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} />
      {/* Stations */}
      {stations.map((s, i) => (
        <g key={i}>
          <circle cx={s.x} cy={s.y} r={14} fill="white" stroke="#E5E7EB" strokeWidth="2" />
          <foreignObject x={s.x - 8} y={s.y - 8} width={16} height={16}>
            <div className="text-gray-700 flex items-center justify-center">{s.icon}</div>
          </foreignObject>
        </g>
      ))}
    </motion.svg>
  );
}

function InteractivePanel({ tab }: { tab: Tab }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div>
          <BrowserMock>
            <AnimatePresence mode="wait" initial={false}>
              {tab === "imovel" && (
                <PanelImovelContent key="imovel" />
              )}
              {tab === "corretor" && (
                <PanelCorretorContent key="corretor" />
              )}
              {tab === "cliente" && (
                <PanelClienteContent key="cliente" />
              )}
            </AnimatePresence>
          </BrowserMock>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {tab === "imovel" && "Publique em minutos"}
            {tab === "corretor" && "Conexão sem atrito"}
            {tab === "cliente" && "Experiência fluida"}
          </h3>
          <p className="text-gray-600 mb-4">
            {tab === "imovel" && "Fotos, detalhes e preço. Um formulário claro e rápido, com dicas que elevam a qualidade do anúncio."}
            {tab === "corretor" && "Quando há interesse, conectamos o cliente a um corretor disponível e alinhado, sem disputa nem pressão."}
            {tab === "cliente" && "Busca objetiva, mapa e contato direto. Agende uma visita sem complicação, tudo em poucos toques."}
          </p>
          <ul className="space-y-2 text-sm text-gray-700">
            {tab === "imovel" && (
              <>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Dicas contextuais para fotos e texto</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Pré-visualização do anúncio em tempo real</li>
                <li className="flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-600" /> Tempo médio de postagem: ~5 min</li>
              </>
            )}
            {tab === "corretor" && (
              <>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Corretores verificados e disponíveis</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Sem leilão: fila justa por afinidade</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Acompanhamento no agendamento e visita</li>
              </>
            )}
            {tab === "cliente" && (
              <>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Filtros úteis e mapa com pins</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Mensagens diretas e objetivas</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Agendamento sem fricção</li>
              </>
            )}
          </ul>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a href="/owner/new" className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-teal to-teal-dark shadow hover:shadow-md">Anunciar agora</a>
            <span className="text-xs text-gray-500">Sem taxas escondidas • Você controla o ritmo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrowserMock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
      <div className="h-9 px-3 flex items-center gap-2 bg-gray-50 border-b">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400"></span>
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400"></span>
        <span className="h-2.5 w-2.5 rounded-full bg-green-400"></span>
        <div className="ml-3 text-xs text-gray-500 truncate">zillowlike.app/anunciar</div>
      </div>
      <div className="p-4 sm:p-5">
        {children}
      </div>
    </div>
  );
}

function PanelImovelContent() {
  return (
    <motion.div key="imovel" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-[4/3] rounded-lg bg-gradient-to-tr from-blue-50 to-purple-50 border border-gray-100" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Título do anúncio" />
        <Field label="Preço" />
        <Field label="Quartos" />
        <Field label="Banheiros" />
      </div>
      <div className="mt-3">
        <Field label="Descrição" long />
      </div>
      <div className="mt-3 inline-flex items-center gap-2 text-xs text-gray-600">
        <Upload className="w-4 h-4" /> Arraste e solte fotos ou clique para enviar
      </div>
    </motion.div>
  );
}

function PanelCorretorContent() {
  return (
    <motion.div key="corretor" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
      <div className="rounded-xl border border-gray-200 p-3 mb-3">
        <div className="text-sm font-medium text-gray-800 mb-2">Fila por afinidade</div>
        <div className="space-y-2 text-sm">
          {['Corretor A (Centro)', 'Corretor B (Zona Sul)', 'Corretor C (Zona Norte)'].map((n, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <span>{n}</span>
              <span className="text-xs text-gray-500">disponível</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border p-3">
          <BadgeCheck className="w-5 h-5 mx-auto text-purple-600" />
          <div className="text-xs mt-1 text-gray-600">Verificação</div>
        </div>
        <div className="rounded-lg border p-3">
          <Calendar className="w-5 h-5 mx-auto text-blue-600" />
          <div className="text-xs mt-1 text-gray-600">Agenda</div>
        </div>
        <div className="rounded-lg border p-3">
          <Handshake className="w-5 h-5 mx-auto text-green-600" />
          <div className="text-xs mt-1 text-gray-600">Acompanhamento</div>
        </div>
      </div>
    </motion.div>
  );
}

function PanelClienteContent() {
  return (
    <motion.div key="cliente" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
      <div className="grid grid-cols-5 gap-2 mb-3">
        <div className="col-span-3 rounded-lg border p-3">
          <div className="text-xs text-gray-500 mb-2">Busca</div>
          <div className="h-8 rounded-md bg-gray-100" />
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[...Array(6)].map((_, i) => (<div key={i} className="h-16 rounded-md bg-gray-100" />))}
          </div>
        </div>
        <div className="col-span-2 rounded-lg border p-3">
          <div className="text-xs text-gray-500 mb-2">Mapa</div>
          <div className="aspect-[4/5] rounded-md bg-gradient-to-tr from-blue-50 to-purple-50 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-600">
        <MessageCircle className="w-4 h-4" /> Mensagens diretas • Agendamento rápido
      </div>
    </motion.div>
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
