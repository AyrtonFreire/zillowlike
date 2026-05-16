"use client";

import PortfolioCompact from "./PortfolioCompact";
import PortfolioEmpty from "./PortfolioEmpty";
import PortfolioFull from "./PortfolioFull";
import PortfolioModerate from "./PortfolioModerate";
import type { PortfolioProperty } from "./PortfolioPropertyTile";

export default function ProfilePortfolioSection({
  realtorName,
  properties,
  totalActiveProperties,
  onOpenOverlay,
  whatsappHref,
  defaultIntent,
}: {
  realtorName: string;
  properties: PortfolioProperty[];
  totalActiveProperties: number;
  onOpenOverlay: (id: string) => void;
  whatsappHref: ((message: string) => string | null) | null;
  defaultIntent?: "BUY" | "RENT";
}) {
  const count = totalActiveProperties ?? properties.length;

  if (count === 0) {
    return (
      <PortfolioEmpty
        realtorName={realtorName}
        whatsappHref={whatsappHref}
        defaultIntent={defaultIntent}
      />
    );
  }

  if (count <= 2) {
    return (
      <PortfolioCompact
        realtorName={realtorName}
        properties={properties}
        onOpenOverlay={onOpenOverlay}
      />
    );
  }

  if (count <= 9) {
    return (
      <PortfolioModerate
        realtorName={realtorName}
        properties={properties}
        onOpenOverlay={onOpenOverlay}
      />
    );
  }

  return (
    <PortfolioFull
      realtorName={realtorName}
      properties={properties}
      onOpenOverlay={onOpenOverlay}
    />
  );
}
