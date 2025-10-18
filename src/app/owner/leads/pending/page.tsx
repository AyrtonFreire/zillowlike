"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Clock, AlertCircle } from "lucide-react";
import OwnerApprovalCard from "@/components/owner/OwnerApprovalCard";

export default function OwnerPendingLeadsPage() {
  const { data: session } = useSession();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ((session?.user as any)?.id) {
      fetchPendingLeads();
    }
  }, [session]);

  const fetchPendingLeads = async () => {
    try {
      // TODO: Criar API para buscar leads pendentes do owner
      const response = await fetch(`/api/owner/leads/pending`);
      if (response.ok) {
        const data = await response.json();
        setLeads(data);
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando solicitações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Solicitações de Visita
              </h1>
              <p className="text-gray-600 mt-1">
                Aprove ou recuse os horários solicitados
              </p>
            </div>
            {leads.length > 0 && (
              <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-full font-medium flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {leads.length} pendente{leads.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {leads.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma solicitação pendente
            </h3>
            <p className="text-gray-600">
              Quando alguém solicitar uma visita, ela aparecerá aqui
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {leads.map((lead) => (
              <OwnerApprovalCard
                key={lead.id}
                lead={lead}
                onApprove={fetchPendingLeads}
                onReject={fetchPendingLeads}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
