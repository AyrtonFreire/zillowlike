"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface MobileSearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export default function MobileSearchBar({ 
  onSearch, 
  placeholder = "Buscar por cidade, bairro...",
  className = "" 
}: MobileSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const SUGGESTIONS = [
    "Petrolina, PE",
    "Juazeiro, BA", 
    "Centro, Petrolina",
    "Jardim Amazonas, Petrolina",
    "Centro, Juazeiro",
    "Santo Antônio, Juazeiro"
  ];

  useEffect(() => {
    if (query.trim()) {
      const filtered = SUGGESTIONS.filter(s => 
        s.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch?.(query);
      router.push(`/?q=${encodeURIComponent(query)}`);
      setIsExpanded(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    onSearch?.(suggestion);
    router.push(`/?q=${encodeURIComponent(suggestion)}`);
    setIsExpanded(false);
  };

  return (
    <>
      {/* Compact Search Bar */}
      <div className={`relative ${className}`}>
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              placeholder={placeholder}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
            
            {/* Search Icon */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Clear Button */}
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSuggestions([]);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </form>

        {/* Suggestions Dropdown */}
        {suggestions.length > 0 && isExpanded && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 animate-fade-in">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors first:rounded-t-2xl last:rounded-b-2xl flex items-center gap-3"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 12.414a6 6 0 10-8.485 0l4.243 4.243a1 1 0 001.414 0z" />
                </svg>
                <span className="text-gray-900">{suggestion}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Expanded Search Overlay */}
      {isExpanded && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsExpanded(false)}
          />
          
          {/* Quick Filters */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 p-4 animate-slide-up">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Busca rápida</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSuggestionClick("Petrolina")}
                  className="p-3 bg-primary-50 text-primary-700 rounded-xl border border-primary-200 text-sm font-medium"
                >
                  📍 Petrolina
                </button>
                <button
                  onClick={() => handleSuggestionClick("Juazeiro")}
                  className="p-3 bg-success-50 text-success-700 rounded-xl border border-success-200 text-sm font-medium"
                >
                  📍 Juazeiro
                </button>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Tipo de imóvel</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                  { type: 'HOUSE', label: '🏠 Casas', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                  { type: 'APARTMENT', label: '🏢 Apartamentos', color: 'bg-green-50 text-green-700 border-green-200' },
                  { type: 'CONDO', label: '🏘️ Condomínios', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                  { type: 'LAND', label: '🌳 Terrenos', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' }
                ].map((item) => (
                  <button
                    key={item.type}
                    onClick={() => {
                      router.push(`/?type=${item.type}`);
                      setIsExpanded(false);
                    }}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl border text-sm font-medium ${item.color}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsExpanded(false)}
              className="w-full btn btn-secondary py-3 text-base font-medium"
            >
              Fechar
            </button>
          </div>
        </>
      )}
    </>
  );
}
