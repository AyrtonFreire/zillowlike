"use client";

import { MessageCircle, Phone, User } from "lucide-react";
import Image from "next/image";

interface RealtorContactCardProps {
  realtor: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    image?: string;
  };
}

/**
 * Card para contato direto com corretor proprietário
 * Aparece em imóveis postados por REALTOR
 */
export function RealtorContactCard({ realtor }: RealtorContactCardProps) {
  const handleWhatsAppContact = () => {
    if (!realtor.phone) return;
    
    // Remove caracteres especiais do telefone
    const cleanPhone = realtor.phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Olá ${realtor.name}! Vi seu imóvel na plataforma e gostaria de mais informações.`
    );
    
    // Abre WhatsApp
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, "_blank");
  };

  const handleEmailContact = () => {
    const subject = encodeURIComponent("Interesse em imóvel");
    const body = encodeURIComponent(
      `Olá ${realtor.name},\n\nVi seu imóvel na plataforma e gostaria de mais informações.\n\nAguardo retorno.`
    );
    window.open(`mailto:${realtor.email}?subject=${subject}&body=${body}`);
  };

  return (
    <div className="border border-blue-200 bg-blue-50/50 rounded-lg">
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar do corretor */}
          <div className="h-16 w-16 border-2 border-blue-200 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center">
            {realtor.image ? (
              <Image src={realtor.image} alt={realtor.name} width={64} height={64} className="object-cover" />
            ) : (
              <span className="text-blue-700 font-semibold text-lg">
                {realtor.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </span>
            )}
          </div>

          <div className="flex-1">
            {/* Título */}
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                Imóvel postado por corretor
              </span>
            </div>

            {/* Nome do corretor */}
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {realtor.name}
            </h3>

            {/* Descrição */}
            <p className="text-sm text-gray-600 mb-4">
              Entre em contato diretamente com o corretor para agendar uma visita
              ou tirar dúvidas sobre este imóvel.
            </p>

            {/* Botões de contato */}
            <div className="flex flex-wrap gap-2">
              {realtor.phone && (
                <button
                  onClick={handleWhatsAppContact}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </button>
              )}

              <button
                onClick={handleEmailContact}
                className="border border-blue-300 text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
              >
                <Phone className="h-4 w-4 mr-2" />
                E-mail
              </button>
            </div>
          </div>
        </div>

        {/* Informações de contato */}
        {realtor.phone && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-4 w-4" />
              <span>{realtor.phone}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
