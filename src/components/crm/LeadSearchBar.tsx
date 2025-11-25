"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, User, Home, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface SearchResult {
  id: string;
  status: string;
  pipelineStage: string;
  property: {
    id: string;
    title: string;
    city: string;
    state: string;
    image: string | null;
  };
  contact: {
    name: string;
    email: string;
  } | null;
}

interface LeadSearchBarProps {
  className?: string;
}

export default function LeadSearchBar({ className = "" }: LeadSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const searchLeads = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/leads/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (response.ok && data.leads) {
        setResults(data.leads);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error("Error searching leads:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => {
        searchLeads(query);
      }, 300);
    } else {
      setResults([]);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchLeads]);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleResultClick = (leadId: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(`/broker/leads/${leadId}`);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  };

  const stageLabels: Record<string, string> = {
    NEW: "Novo",
    CONTACT: "Em contato",
    VISIT: "Visita",
    PROPOSAL: "Proposta",
    DOCUMENTS: "Documentação",
    WON: "Fechado",
    LOST: "Perdido",
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar leads por nome, imóvel ou cidade..."
          className="w-full pl-9 pr-9 py-2 text-sm bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Dropdown de resultados */}
      <AnimatePresence>
        {isOpen && query.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 max-h-96 overflow-y-auto"
          >
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center">
                {isLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    <p className="text-sm text-gray-500">Buscando...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Search className="w-8 h-8 text-gray-300" />
                    <p className="text-sm text-gray-500">
                      Nenhum lead encontrado para "{query}"
                    </p>
                    <p className="text-xs text-gray-400">
                      Tente buscar por nome do cliente, cidade ou título do imóvel
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-2">
                <p className="px-4 py-1 text-[11px] font-semibold text-gray-400 uppercase">
                  {results.length} resultado{results.length !== 1 ? "s" : ""}
                </p>
                {results.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => handleResultClick(lead.id)}
                    className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    {/* Imagem do imóvel */}
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {lead.property.image ? (
                        <Image
                          src={lead.property.image}
                          alt={lead.property.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Informações */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {lead.property.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {lead.property.city} - {lead.property.state}
                      </p>
                      {lead.contact && (
                        <div className="flex items-center gap-1 mt-1">
                          <User className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-600 truncate">
                            {lead.contact.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Badge de estágio */}
                    <span
                      className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        lead.pipelineStage === "WON"
                          ? "bg-green-100 text-green-700"
                          : lead.pipelineStage === "LOST"
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {stageLabels[lead.pipelineStage] || lead.pipelineStage}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
