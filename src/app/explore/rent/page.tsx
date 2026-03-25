"use client";

import { ModernNavbar } from "@/components/modern";
import ExploreCityGate from "../_components/ExploreCityGate";

export default function ExploreRentPage() {
  return (
    <div className="min-h-screen bg-[#f4f0e8]">
      <ModernNavbar forceLight />
      <ExploreCityGate mode="rent" variant="immersive" />
    </div>
  );
}
