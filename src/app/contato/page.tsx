import Link from "next/link";
import { ArrowRight, Mail, MessageCircle } from "lucide-react";

export const metadata = {
  title: "Fale com a gente — OggaHub",
  description: "Canais diretos para falar com o time do OggaHub.",
};

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "contato@oggahub.com";

function buildWhatsappUrl(): string | null {
  const phone = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;
  if (!phone) return null;
  const clean = phone.replace(/\D/g, "");
  if (!clean) return null;
  const greeting = "Olá! Vim do site OggaHub e gostaria de tirar uma dúvida.";
  return `https://wa.me/${clean}?text=${encodeURIComponent(greeting)}`;
}

export default function ContatoPage() {
  const whatsappUrl = buildWhatsappUrl();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-600">Estamos por aqui</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Fale com a gente</h1>
          <p className="mt-4 text-base text-slate-600">
            Tem uma dúvida ou precisa de ajuda? Escolha o canal mais confortável para você — atendemos pessoas de todas as idades, sem pressa.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col justify-between rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm transition hover:border-emerald-400 hover:shadow-md"
            >
              <div>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                  <MessageCircle className="h-6 w-6" />
                </span>
                <h2 className="mt-4 text-xl font-semibold text-slate-950">Conversar no WhatsApp</h2>
                <p className="mt-2 text-base text-slate-600">Resposta rápida durante o horário comercial. O caminho mais simples.</p>
              </div>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                Abrir conversa
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </a>
          ) : null}

          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Dúvida sobre o OggaHub")}`}
            className="group flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-400 hover:shadow-md"
          >
            <div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <Mail className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-xl font-semibold text-slate-950">Enviar e-mail</h2>
              <p className="mt-2 text-base text-slate-600">
                Para assuntos mais detalhados, mande para <span className="font-medium text-slate-900">{SUPPORT_EMAIL}</span>.
              </p>
            </div>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
              Abrir e-mail
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </a>
        </div>

        <div className="mt-12 rounded-3xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-950">Procurando outra coisa?</h3>
          <ul className="mt-3 space-y-2 text-base text-slate-700">
            <li>
              <Link href="/para-profissionais" className="font-medium text-teal-700 hover:text-teal-800">
                Sou corretor(a) ou imobiliária →
              </Link>
            </li>
            <li>
              <Link href="/guides" className="font-medium text-teal-700 hover:text-teal-800">
                Guias e dicas →
              </Link>
            </li>
            <li>
              <Link href="/sobre" className="font-medium text-teal-700 hover:text-teal-800">
                Sobre o OggaHub →
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
