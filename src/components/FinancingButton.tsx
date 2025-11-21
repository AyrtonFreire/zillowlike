"use client";

import Link from "next/link";
import { getLowestFinancing } from "@/lib/financing";

interface FinancingButtonProps {
  propertyId: string;
  propertyValue: number; // Valor em centavos
  className?: string;
}

export default function FinancingButton({ 
  propertyId, 
  propertyValue, 
  className = "" 
}: FinancingButtonProps) {
  const valueInReais = propertyValue / 100;
  const { calculation } = getLowestFinancing(valueInReais);
  
  const monthlyPaymentFormatted = calculation.monthlyPayment.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  return (
    <Link 
      href={`/financing/${propertyId}`}
      className={`inline-flex items-center gap-2 px-4 py-3 glass-teal text-white rounded-lg font-semibold transition-colors shadow-sm hover:shadow-md ${className}`}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
      <div className="text-left">
        <div className="text-sm opacity-90">Financiamento a partir de:</div>
        <div className="text-lg font-bold">{monthlyPaymentFormatted}/mês</div>
      </div>
    </Link>
  );
}
