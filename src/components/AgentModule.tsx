"use client";
import Button from "@/components/ui/Button";
import { Mail, Phone, MessageCircle } from "lucide-react";

interface AgentModuleProps {
  agent?: { name: string; email?: string; phone?: string; logo?: string; whatsapp?: string; verified?: boolean };
}

export default function AgentModule({ agent }: AgentModuleProps) {
  if (!agent) return null;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur p-5 shadow-xl">
      <div className="flex items-start gap-4 mb-4">
        {agent.logo && (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center overflow-hidden">
            <img src={agent.logo} alt={agent.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">{agent.name}</h3>
            {agent.verified && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Verificado</span>
            )}
          </div>
          <p className="text-sm text-gray-600">Corretor/Imobiliária</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {agent.phone && (
          <Button variant="secondary" className="w-full" leftIcon={<Phone className="w-4 h-4"/>}>
            <a href={`tel:${agent.phone}`} className="w-full text-left">{agent.phone}</a>
          </Button>
        )}
        {agent.whatsapp && (
          <Button variant="secondary" className="w-full" leftIcon={<MessageCircle className="w-4 h-4"/>}>
            <a href={`https://wa.me/${agent.whatsapp}`} target="_blank" rel="noopener" className="w-full text-left">WhatsApp</a>
          </Button>
        )}
        {agent.email && (
          <Button variant="ghost" className="w-full border" leftIcon={<Mail className="w-4 h-4"/>}>
            <a href={`mailto:${agent.email}`} className="w-full text-left">E-mail</a>
          </Button>
        )}
      </div>
    </div>
  );
}
