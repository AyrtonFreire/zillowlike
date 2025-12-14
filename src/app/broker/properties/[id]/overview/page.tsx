"use client";

import { useParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import PropertyDetailsModalJames from "@/components/PropertyDetailsModalJames";

export default function BrokerPropertyOverviewPage() {
  const params = useParams();
  const propertyId = params?.id as string;

  return (
    <DashboardLayout
      title="Visão geral do imóvel"
      description="Detalhes completos do anúncio + ferramentas internas."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Corretor", href: "/broker/dashboard" },
        { label: "Meus imóveis", href: "/broker/properties" },
        { label: "Visão geral" },
      ]}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PropertyDetailsModalJames
          propertyId={propertyId}
          open
          variant="page"
          mode="internal"
          backHref="/broker/properties"
          backLabel="Voltar aos imóveis"
        />
      </div>
    </DashboardLayout>
  );
}
