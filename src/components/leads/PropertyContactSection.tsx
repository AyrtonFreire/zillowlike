"use client";

import { useEffect, useState } from "react";
import { RealtorContactCard } from "./RealtorContactCard";
import ScheduleVisitForm from "@/components/scheduling/ScheduleVisitForm";
import { Loader2 } from "lucide-react";

interface PropertyContactSectionProps {
  propertyId: string;
}

/**
 * Componente inteligente que decide qual UI mostrar:
 * - Se imóvel de corretor → Mostra card de contato direto
 * - Se imóvel de pessoa física → Mostra formulário de agendamento
 */
export function PropertyContactSection({ propertyId }: PropertyContactSectionProps) {
  const [loading, setLoading] = useState(true);
  const [isRealtorProperty, setIsRealtorProperty] = useState(false);
  const [realtorInfo, setRealtorInfo] = useState<any>(null);

  useEffect(() => {
    async function checkPropertyOwner() {
      try {
        const response = await fetch(`/api/properties/${propertyId}/owner-info`);
        const data = await response.json();

        setIsRealtorProperty(data.isRealtorProperty);
        setRealtorInfo(data.owner);
      } catch (error) {
        console.error("Error checking property owner:", error);
      } finally {
        setLoading(false);
      }
    }

    checkPropertyOwner();
  }, [propertyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Imóvel de corretor → Mostra contato direto
  if (isRealtorProperty && realtorInfo) {
    return <RealtorContactCard realtor={realtorInfo} />;
  }

  // Imóvel de pessoa física → Mostra agendamento
  return <ScheduleVisitForm propertyId={propertyId} />;
}
