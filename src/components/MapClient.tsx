"use client";

import dynamic from "next/dynamic";

// Client-only wrapper for the Leaflet map
const InnerMap = dynamic(() => import("@/components/Map"), { ssr: false });

export default function MapClient(props: any) {
  return <InnerMap {...props} />;
}
