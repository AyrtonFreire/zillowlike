"use client";

import { ModernNavbar } from "@/components/modern";
import ExploreCityGate from "../_components/ExploreCityGate";

export default function ExploreRentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-sky-50">
      <ModernNavbar forceLight />
      <div className="mt-16">
        <ExploreCityGate mode="rent" />
      </div>
    </div>
  );
}
