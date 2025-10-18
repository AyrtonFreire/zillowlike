"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import ScheduleVisitForm from "@/components/scheduling/ScheduleVisitForm";

export default function ScheduleVisitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const handleSuccess = () => {
    // Redirecionar para página de confirmação
    router.push(`/property/${id}?scheduled=true`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href={`/property/${id}`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao imóvel
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Agendar Visita
          </h1>
          <p className="text-gray-600 mt-2">
            Escolha o melhor dia e horário para conhecer o imóvel
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
          <ScheduleVisitForm propertyId={id} onSuccess={handleSuccess} />
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Home className="w-5 h-5" />
            Como funciona?
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>1. Escolha o dia e horário que preferir</li>
            <li>2. Preencha seus dados de contato</li>
            <li>3. Corretores da região verão sua solicitação</li>
            <li>4. Você receberá confirmação por email</li>
            <li>5. Pronto! Sua visita está agendada</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
