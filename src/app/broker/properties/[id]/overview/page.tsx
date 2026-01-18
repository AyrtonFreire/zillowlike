"use client";

import { useParams } from "next/navigation";
import PropertyDetailsModalJames from "@/components/PropertyDetailsModalJames";

export default function BrokerPropertyOverviewPage() {
  const params = useParams();
  const propertyId = params?.id as string;

  return (
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
  );
}
