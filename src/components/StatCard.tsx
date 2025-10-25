"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export default function StatCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  unit?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="group relative rounded-2xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{background: "radial-gradient(circle at 30% 10%, rgba(59,130,246,0.08), transparent 40%)"}} />
      <div className="relative flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
          <div className="text-lg font-semibold text-gray-900">
            {value}
            {unit ? <span className="ml-1 text-gray-500 text-sm">{unit}</span> : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
