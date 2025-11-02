"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Home, Users, TrendingUp, Award, Camera, Eye, MessageSquare, Shield, Sparkles, CheckCircle, ArrowRight } from "lucide-react";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  const sections = [
    {
      icon: Home,
      title: "Anuncie Gratuitamente",
      description: "Proprietários podem anunciar seus imóveis sem custo algum",
      color: "teal",
      features: [
        "Cadastro simples e rápido",
        "Fotos ilimitadas em alta qualidade",
        "Descrição detalhada do imóvel",
        "Geolocalização precisa"
      ]
    },
    {
      icon: Users,
      title: "Para Corretores",
      description: "Acesso profissional a leads qualificados",
      color: "blue",
      features: [
        "Painel exclusivo com leads em tempo real",
        "Sistema de captação inteligente",
        "Analytics detalhado de visualizações",
        "Badge de verificação profissional"
      ]
    },
    {
      icon: TrendingUp,
      title: "Mural de Leads",
      description: "Conecte-se diretamente com interessados",
      color: "purple",
      features: [
        "Receba notificações instantâneas",
        "Histórico completo de contatos",
        "Responda pelo próprio painel",
        "Filtre leads por interesse"
      ]
    },
    {
      icon: Award,
      title: "Venda Direta",
      description: "Negocie sem intermediários e economize",
      color: "green",
      features: [
        "Sem taxas de comissão",
        "Chat direto com interessados",
        "Total controle da negociação",
        "Atendimento 100% pela plataforma"
      ]
    }
  ];

  const premiumFeatures = [
    { icon: Camera, text: "Tours virtuais 360°" },
    { icon: Eye, text: "Destaque na home" },
    { icon: MessageSquare, text: "Suporte prioritário" },
    { icon: Shield, text: "Selo de verificação" }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[12000]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-3xl shadow-2xl z-[12001] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-teal-600 via-teal-700 to-blue-600 text-white px-6 md:px-8 py-6 md:py-8">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="max-w-3xl"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="w-8 h-8" />
                  <h2 className="text-3xl md:text-4xl font-bold">Como Funciona</h2>
                </div>
                <p className="text-white/90 text-lg">
                  Descubra tudo o que a plataforma oferece para você comprar, vender ou alugar seu imóvel com total segurança
                </p>
              </motion.div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 md:px-8 py-8">
              {/* Main Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {sections.map((section, index) => (
                  <motion.div
                    key={section.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${section.color}-500 to-${section.color}-600 text-white flex items-center justify-center mb-4 shadow-lg`}>
                      <section.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{section.title}</h3>
                    <p className="text-gray-600 mb-4 text-sm">{section.description}</p>
                    <ul className="space-y-2">
                      {section.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>

              {/* Premium Features Banner */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-200 rounded-2xl p-6 md:p-8 mb-8"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Recursos Premium</h3>
                </div>
                <p className="text-gray-700 mb-6">
                  Destaque seu imóvel e alcance ainda mais compradores com nossos recursos exclusivos
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {premiumFeatures.map((feature, i) => (
                    <div key={i} className="flex flex-col items-center text-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center">
                        <feature.icon className="w-6 h-6 text-amber-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-800">{feature.text}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Security & Trust */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">100% Seguro e Confiável</h3>
                    <p className="text-gray-700 mb-4">
                      Todos os anúncios são verificados pela nossa equipe. Seus dados estão protegidos e você tem total controle sobre suas informações de contato.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <span className="px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-700 shadow-sm">
                        🔒 Dados criptografados
                      </span>
                      <span className="px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-700 shadow-sm">
                        ✓ Anúncios verificados
                      </span>
                      <span className="px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-700 shadow-sm">
                        🛡️ Anti-fraude
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Footer CTA */}
            <div className="border-t bg-gray-50 px-6 md:px-8 py-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-gray-900 font-semibold mb-1">Pronto para começar?</p>
                  <p className="text-gray-600 text-sm">Crie sua conta e anuncie gratuitamente</p>
                </div>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group"
                >
                  <span>Começar agora</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
