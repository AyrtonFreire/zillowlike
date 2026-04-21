"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LayoutDashboard, MessageSquare, Sparkles, UserRound } from "lucide-react";

export default function BrokerProfilePage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace("/profile?onboarding=broker");
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-0">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          <Sparkles className="h-4 w-4" />
          Perfil profissional unificado
        </div>

        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
          A edição do perfil do corretor agora acontece na tela central de perfil.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
          Para evitar duplicidade, headline, bio, regiões de atuação, WhatsApp, redes e prévia do perfil público passaram a ser gerenciados em <span className="font-semibold text-gray-900">/profile</span>.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <UserRound className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-semibold text-gray-900">Editar apresentação</div>
            <p className="mt-1 text-sm text-gray-600">Atualize posicionamento, bio, contato e áreas atendidas no perfil central.</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-semibold text-gray-900">Conectar com operação</div>
            <p className="mt-1 text-sm text-gray-600">Use painel, leads e CRM com o mesmo contexto comercial do seu perfil público.</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-semibold text-gray-900">Responder mais rápido</div>
            <p className="mt-1 text-sm text-gray-600">Mantenha canais públicos consistentes com suas conversas e acompanhamento de leads.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/profile?onboarding=broker" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700">
            Abrir perfil profissional
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/broker/dashboard" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
            Voltar ao painel
          </Link>
        </div>

        <p className="mt-4 text-xs text-gray-500">Você será redirecionado automaticamente em instantes.</p>
      </div>
    </div>
  );
}
