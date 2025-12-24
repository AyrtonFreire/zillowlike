import RealtorPropertiesGrid from "@/components/RealtorPropertiesGrid";
import RealtorSalesGallery from "@/components/RealtorSalesGallery";

type ActiveProperty = {
  id: string;
  title: string;
  price: number;
  city: string;
  state: string;
  bedrooms?: number;
  bathrooms?: number;
  areaM2?: number;
  neighborhood?: string;
  parkingSpots?: number;
  conditionTags?: string[];
  type: string;
  purpose: string;
  images: { url: string }[];
  createdAt?: string | Date;
  viewsCount?: number;
  leadsCount?: number;
  benchmarkPricePerM2?: number | null;
  benchmarkConversionRate?: number | null;
  benchmarkLeadsTop20Threshold?: number | null;
};

type SoldProperty = {
  id: string;
  title: string;
  price: number;
  city: string;
  state: string;
  neighborhood?: string;
  type: string;
  purpose: string;
  status: string;
  soldAt?: string;
  images: { url: string }[];
};

type Props = {
  soldProperties: SoldProperty[];
  activeProperties: ActiveProperty[];
  realtorName: string;
};

export default function ListaImoveis({ soldProperties, activeProperties, realtorName }: Props) {
  return (
    <div className="space-y-6">
      <RealtorSalesGallery properties={soldProperties} />
      <RealtorPropertiesGrid properties={activeProperties} realtorName={realtorName} />
    </div>
  );
}
