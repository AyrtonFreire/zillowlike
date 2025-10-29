"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, FileText, Users, Rocket, PlayCircle } from "lucide-react";
import Link from "next/link";

export default function HowItWorksPostCard() {
  const [open, setOpen] = useState(false);

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="relative overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-gray-200">
        {/* Decorative gradient */}
        <div className="pointer-events-none absolute -top-32 -right-32 h-64 w-64 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-tr from-purple-500/15 to-blue-500/15 blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 sm:p-10">
          {/* Left: copy */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
              Postar é simples. Veja como funciona
            </h2>
            <p className="mt-3 text-gray-600 max-w-xl">
              Publique seu imóvel em minutos, receba contatos verificados e tenha máxima exposição. Sem pressão, sem complicação: ferramentas úteis e liberdade total.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="how-it-works-content"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <PlayCircle className="w-5 h-5" />
                Veja como é fácil
              </button>
              <Link
                href="/owner/new"
                className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold border border-gray-300 text-gray-800 bg-white hover:bg-gray-50"
              >
                Anunciar agora
              </Link>
            </div>

            {/* Trust/benefits strip */}
            <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sm text-gray-600">
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">Alcance máximo</div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">Sem taxas escondidas</div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">Ferramentas úteis</div>
            </div>
          </div>

          {/* Right: motion graphic */}
          <div className="flex items-center justify-center">
            <motion.svg
              width="360"
              height="220"
              viewBox="0 0 360 220"
              className="max-w-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Path line */}
              <motion.path
                d="M20 180 C 120 80, 240 280, 340 120"
                fill="none"
                stroke="url(#grad)"
                strokeWidth="6"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: open ? 1 : 0.6 }}
                transition={{ duration: 0.9, ease: "easeInOut" }}
              />
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#7C3AED" />
                </linearGradient>
              </defs>
              {/* Floating dot */}
              <motion.circle
                r="7"
                fill="#7C3AED"
                animate={{
                  cx: open ? 340 : 120,
                  cy: open ? 120 : 120,
                }}
                initial={{ cx: 20, cy: 180 }}
                transition={{ duration: 0.9, ease: "easeInOut" }}
              />
            </motion.svg>
          </div>
        </div>

        {/* Steps expandable */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id="how-it-works-content"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35 }}
              className="relative z-10 px-6 sm:px-10 pb-10"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Step
                  icon={<FileText className="w-6 h-6" />}
                  title="Crie seu anúncio"
                  text="Fotos, descrição e preço. Em minutos seu anúncio está pronto."
                />
                <Step
                  icon={<Users className="w-6 h-6" />}
                  title="Receba contatos verificados"
                  text="Conexão direta com interessados, sem pressão e sem leilão."
                />
                <Step
                  icon={<Megaphone className="w-6 h-6" />}
                  title="Máxima exposição"
                  text="Seu imóvel em destaque, com ferramentas úteis para vender."
                />
              </div>
              <div className="mt-8 flex items-center justify-center">
                <Link
                  href="/owner/new"
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow hover:shadow-md"
                >
                  <Rocket className="w-5 h-5" />
                  Começar agora
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function Step({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <motion.div
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      initial={{ y: 12, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-20%" }}
      transition={{ duration: 0.45 }}
      layout
    >
      <div className="mb-3 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600/10 to-purple-600/10 text-blue-700 p-3">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-600">{text}</p>
    </motion.div>
  );
}
