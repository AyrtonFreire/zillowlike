"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

interface FilterDrawerProps {
  onApplyFilters?: (filters: any) => void;
}

export default function FilterDrawer({ onApplyFilters }: FilterDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: "",
    maxPrice: "",
    propertyType: "",
    bedrooms: "",
    bathrooms: "",
  });

  const handleApply = () => {
    if (onApplyFilters) {
      onApplyFilters(filters);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setFilters({
      minPrice: "",
      maxPrice: "",
      propertyType: "",
      bedrooms: "",
      bathrooms: "",
    });
  };

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-40 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 rounded-full shadow-2xl hover:shadow-glow transition-all flex items-center gap-2"
      >
        <SlidersHorizontal className="w-6 h-6" />
        <span className="font-semibold hidden sm:inline">Filtros</span>
      </motion.button>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />

            {/* Drawer Content */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Filtros</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Filter Content */}
              <div className="p-6 space-y-6">
                {/* Faixa de Preço */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Faixa de Preço
                  </label>
                  <div className="flex gap-4">
                    <input
                      type="text"
                      placeholder="Mínimo"
                      value={filters.minPrice}
                      onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                    <input
                      type="text"
                      placeholder="Máximo"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Tipo de Imóvel */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Tipo de Imóvel
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {["HOUSE", "APARTMENT", "LAND", "COMMERCIAL"].map((type) => (
                      <button
                        key={type}
                        onClick={() => setFilters({ ...filters, propertyType: type })}
                        className={`px-4 py-3 border-2 rounded-xl font-medium transition-all ${
                          filters.propertyType === type
                            ? "border-blue-600 bg-blue-50 text-blue-600"
                            : "border-gray-200 hover:border-blue-600 hover:bg-blue-50"
                        }`}
                      >
                        {type === "HOUSE" && "Casa"}
                        {type === "APARTMENT" && "Apartamento"}
                        {type === "LAND" && "Terreno"}
                        {type === "COMMERCIAL" && "Comercial"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quartos */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Quartos
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, "5+"].map((num) => (
                      <button
                        key={num}
                        onClick={() => setFilters({ ...filters, bedrooms: String(num) })}
                        className={`flex-1 py-3 border-2 rounded-xl font-semibold transition-all ${
                          filters.bedrooms === String(num)
                            ? "border-blue-600 bg-blue-50 text-blue-600"
                            : "border-gray-200 hover:border-blue-600 hover:bg-blue-50"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Banheiros */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Banheiros
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, "4+"].map((num) => (
                      <button
                        key={num}
                        onClick={() => setFilters({ ...filters, bathrooms: String(num) })}
                        className={`flex-1 py-3 border-2 rounded-xl font-semibold transition-all ${
                          filters.bathrooms === String(num)
                            ? "border-blue-600 bg-blue-50 text-blue-600"
                            : "border-gray-200 hover:border-blue-600 hover:bg-blue-50"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClear}
                  className="flex-1 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Limpar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleApply}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Aplicar
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
