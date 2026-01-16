"use client";

import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function TeamCrmPage() {
  return (
    <DashboardLayout
      title="Conversas do time"
      description="Use o chat interno para falar com a imobiliária."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Corretor", href: "/broker/dashboard" },
        { label: "Meus times", href: "/broker/teams" },
        { label: "Conversas do time" },
      ]}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <Link href="/broker/teams" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar para times
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Chat interno do time</h2>
              <p className="text-sm text-gray-600">
                A visão de funil do time foi desativada. Continue acompanhando seus leads e use o chat interno para falar com a imobiliária.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/broker/messages"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              Abrir conversas do time
            </Link>
            <Link
              href="/broker/leads"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Ver meus leads
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
