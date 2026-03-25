"use client";

import { ModernNavbar } from "@/components/modern";
import ExploreCityGate from "../_components/ExploreCityGate";

export default function ExploreBuyPage() {
  return (
    <div className="min-h-screen bg-[#f4f0e8]">
      <ModernNavbar forceLight />
      <ExploreCityGate mode="buy" variant="immersive" />
    </div>
  );
}
