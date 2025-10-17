"use client";

import Image from "next/image";
import { useState } from "react";

interface BankLogoProps {
  bankId: string;
  className?: string;
  size?: number;
}

export default function BankLogo({ bankId, className = "", size = 48 }: BankLogoProps) {
  const [imageError, setImageError] = useState(false);
  
  // URLs dos logos oficiais dos bancos (Wikimedia Special:FilePath)
  const logoUrls = {
    caixa: "https://upload.wikimedia.org/wikipedia/commons/8/8d/Caixa_Econ%C3%B4mica_Federal_logo.svg",
    bb: "https://commons.wikimedia.org/wiki/Special:FilePath/Banco_do_Brasil_Logo.svg",
    itau: "https://commons.wikimedia.org/wiki/Special:FilePath/Banco_Ita%C3%BA_logo.svg",
    bradesco: "https://commons.wikimedia.org/wiki/Special:FilePath/Banco_Bradesco_logo_(horizontal).png",
    santander: "https://upload.wikimedia.org/wikipedia/commons/b/b8/Banco_Santander_Logotipo.svg"
  };

  const bankNames = {
    caixa: "CEF",
    bb: "BB",
    itau: "Itaú", 
    bradesco: "Bradesco",
    santander: "Santander"
  };

  const bankColors = {
    caixa: "#003d82",
    bb: "#ffed00",
    itau: "#ec7000",
    bradesco: "#cc092f", 
    santander: "#ec0000"
  };

  const logoUrl = logoUrls[bankId as keyof typeof logoUrls];
  const bankName = bankNames[bankId as keyof typeof bankNames];
  const bankColor = bankColors[bankId as keyof typeof bankColors];

  // Se não há URL ou houve erro, mostra fallback
  if (!logoUrl || imageError) {
    return (
      <div 
        className={`rounded-lg flex items-center justify-center text-white font-bold text-xs ${className}`}
        style={{ 
          width: size, 
          height: size, 
          backgroundColor: bankColor || "#6B7280",
          minWidth: size,
          minHeight: size
        }}
      >
        {bankName || "?"}
      </div>
    );
  }

  return (
    <div 
      className={`rounded-lg overflow-hidden bg-white border border-gray-200 flex items-center justify-center p-1 ${className}`}
      style={{ 
        width: size, 
        height: size,
        minWidth: size,
        minHeight: size
      }}
    >
      <Image
        src={logoUrl}
        alt={`Logo ${bankName}`}
        width={size - 8}
        height={size - 8}
        className="object-contain max-w-full max-h-full"
        onError={() => setImageError(true)}
        unoptimized={logoUrl.includes('.svg')}
      />
    </div>
  );
}
