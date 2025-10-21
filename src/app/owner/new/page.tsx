"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import Link from "next/link";
import { geocodeAddress } from "@/lib/geocode";
import { PropertyCreateSchema } from "@/lib/schemas";
import Toast from "@/components/Toast";

type ImageInput = { url: string; alt?: string; useUrl?: boolean };

export default function NewPropertyPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success"|"error"|"info" } | null>(null);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceBRL, setPriceBRL] = useState("");
  const [type, setType] = useState("HOUSE");

  const [street, setStreet] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("Petrolina");
  const [state, setState] = useState("PE");
  const [postalCode, setPostalCode] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const numberInputRef = useRef<HTMLInputElement | null>(null);
  const [cepValid, setCepValid] = useState(false);

  const [bedrooms, setBedrooms] = useState<number | "">("");
  const [bathrooms, setBathrooms] = useState<number | "">("");
  const [areaM2, setAreaM2] = useState<number | "">("");

  const [images, setImages] = useState<ImageInput[]>([{ url: "", useUrl: false }]);
  const dragIndex = useRef<number | null>(null);
  const SAVE_KEY = "owner_new_draft";

  // dnd-kit: sensors e item ordenável
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function SortableItem({ id, children }: { id: string; children: ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.95 : 1,
      boxShadow: isDragging ? '0 12px 30px rgba(0,0,0,0.2)' : undefined,
      borderRadius: '0.75rem',
      cursor: isDragging ? 'grabbing' : 'grab',
    };
    return (
      <div ref={setNodeRef} style={style} className={isDragging ? 'ring-2 ring-blue-500' : ''} {...attributes} {...listeners}>
        {children}
      </div>
    );
  }

  function formatBRLInput(raw: string) {
    // Máscara sem centavos: mantém apenas dígitos e separa milhares com ponto
    const digits = raw.replace(/\D+/g, "");
    if (!digits) return "";
    const intFmt = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return intFmt; // 1.234.567
  }

  function formatCEP(raw: string) {
    const digits = raw.replace(/\D+/g, "").slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0,5)}-${digits.slice(5)}`;
  }

  function parseBRLToNumber(input: string) {
    if (!input) return 0;
    const digits = input.replace(/\D+/g, "");
    const n = Number(digits);
    return isNaN(n) ? 0 : n; // inteiro em reais
  }

  // Load draft
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.title) setTitle(d.title);
      if (d.description) setDescription(d.description);
      if (d.priceBRL) setPriceBRL(d.priceBRL);
      if (d.type) setType(d.type);
      if (d.street) setStreet(d.street);
      if (d.neighborhood) setNeighborhood(d.neighborhood);
      if (d.city) setCity(d.city);
      if (d.state) setState(d.state);
      if (d.postalCode) setPostalCode(d.postalCode);
      if (typeof d.bedrooms !== 'undefined') setBedrooms(d.bedrooms);
      if (typeof d.bathrooms !== 'undefined') setBathrooms(d.bathrooms);
      if (typeof d.areaM2 !== 'undefined') setAreaM2(d.areaM2);
      if (Array.isArray(d.images)) setImages(d.images);
    } catch {}
  }, []);

  // Autosave draft (debounced)
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const payload = {
          title, description, priceBRL, type,
          street, neighborhood, city, state, postalCode,
          bedrooms, bathrooms, areaM2, images, addressNumber,
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      } catch {}
    }, 400);
    return () => clearTimeout(id);
  }, [title, description, priceBRL, type, street, neighborhood, city, state, postalCode, bedrooms, bathrooms, areaM2, images]);

  // CEP: validação em tempo real com debounce quando atingir 8 dígitos
  useEffect(() => {
    const cepDigits = postalCode.replace(/\D+/g, "");
    if (cepDigits.length !== 8) { setCepValid(false); return; }
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`, { cache: 'no-store' });
        const data = await res.json();
        if (data?.erro) {
          setToast({ message: "CEP não encontrado", type: "error" });
          setCepValid(false);
          return;
        }
        setStreet(data.logradouro || "");
        setNeighborhood(data.bairro || "");
        setCity(data.localidade || city);
        setState(data.uf || state);
        setCepValid(true);
        // Focar no número
        setTimeout(() => numberInputRef.current?.focus(), 50);
      } catch {
        setToast({ message: "Falha ao buscar CEP", type: "error" });
        setCepValid(false);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [postalCode]);

  const [geoPreview, setGeoPreview] = useState<string>("");
  const addressString = useMemo(
    () =>
      [street, neighborhood, city, state, postalCode]
        .filter(Boolean)
        .join(", "),
    [street, neighborhood, city, state, postalCode]
  );

  const steps = [
    { id: 1, name: "Informações básicas", description: "Título, preço e tipo" },
    { id: 2, name: "Localização", description: "Endereço completo" },
    { id: 3, name: "Detalhes", description: "Quartos, banheiros e área" },
    { id: 4, name: "Fotos", description: "Imagens do imóvel" },
  ];

  async function handleGeocode() {
    if (!addressString) return;
    const result = await geocodeAddress(addressString);
    setGeoPreview(result?.displayName || "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validação: exigir ao menos uma imagem com URL preenchida (upload concluído ou URL manual)
      const hasAtLeastOneImage = images.some((img) => img.url && img.url.trim().length > 0);
      if (!hasAtLeastOneImage) {
        setToast({ message: "Adicione pelo menos uma foto antes de publicar.", type: "error" });
        setCurrentStep(4);
        return;
      }

      const geo = await geocodeAddress(addressString);
      if (!geo) {
        setToast({ message: "Endereço não encontrado. Tente ser mais específico.", type: "error" });
        return;
      }

      const payload = {
        title,
        description,
        priceBRL: parseBRLToNumber(priceBRL),
        type,
        address: { street, neighborhood, city, state, postalCode, number: addressNumber || undefined },
        geo: { lat: geo.lat, lng: geo.lng },
        details: {
          bedrooms: bedrooms === "" ? null : Number(bedrooms),
          bathrooms: bathrooms === "" ? null : Number(bathrooms),
          areaM2: areaM2 === "" ? null : Number(areaM2),
        },
        images: images.map((img, i) => ({ url: img.url, alt: img.alt, sortOrder: i })),
      };

      const parsed = PropertyCreateSchema.safeParse(payload);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        setToast({ message: `Dados inválidos: ${first.path.join('.')}: ${first.message}`, type: "error" });
        return;
      }

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (res.status === 429) {
        setToast({ message: "Muitas requisições, tente novamente em instantes.", type: "error" });
        return;
      }
      if (!res.ok) {
        setToast({ message: "Falha ao criar imóvel", type: "error" });
        return;
      }
      
      const created = await res.json();
      setToast({ message: "Imóvel publicado com sucesso!", type: "success" });
      window.location.href = "/?city=" + encodeURIComponent(city) + "&state=" + state;
    } finally {
      setIsSubmitting(false);
    }
  }

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      {/* Header */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200">
            ← Voltar à busca
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                  currentStep >= step.id 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-500'
                }`}>
                  {step.id}
                </div>
                <div className="ml-3 hidden sm:block">
                  <div className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 transition-all duration-200 ${
                    currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cadastrar Imóvel</h1>
          <p className="text-gray-600 mb-8">Preencha as informações do seu imóvel para publicá-lo na plataforma.</p>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Informações básicas</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título do anúncio *
                  </label>
                  <input
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Ex: Casa com 3 quartos próximo ao centro"
                    value={title}
                    maxLength={70}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                  <div className="mt-1 text-xs text-gray-500">{title.length}/70</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço (R$) *
                  </label>
                  <input
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="450.000"
                    inputMode="numeric"
                    value={priceBRL}
                    onChange={(e) => setPriceBRL(formatBRLInput(e.target.value))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de imóvel *
                  </label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="HOUSE">Casa</option>
                    <option value="APARTMENT">Apartamento</option>
                    <option value="CONDO">Condomínio</option>
                    <option value="TOWNHOUSE">Sobrado</option>
                    <option value="STUDIO">Studio</option>
                    <option value="LAND">Terreno</option>
                    <option value="COMMERCIAL">Comercial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição *
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    rows={4}
                    placeholder="Descreva o imóvel, suas características e o que o torna especial..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Localização</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CEP</label>
                  <input
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="56300-000"
                    value={postalCode}
                    onChange={(e) => setPostalCode(formatCEP(e.target.value))}
                    inputMode="numeric"
                  />
                  <p className="mt-1 text-xs text-gray-500">Digite apenas números; formatamos automaticamente (99999-999).</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rua *
                    </label>
                    <input
                      className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 ${!cepValid ? 'bg-gray-100 border-gray-300 text-gray-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'}`}
                      placeholder="Rua das Flores, 123"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      disabled
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Número *</label>
                    <input
                      ref={numberInputRef}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="123"
                      value={addressNumber}
                      onChange={(e) => setAddressNumber(e.target.value)}
                      // número é opcional
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bairro
                    </label>
                    <input
                      className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 ${!cepValid ? 'bg-gray-100 border-gray-300 text-gray-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'}`}
                      placeholder="Centro"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cidade *
                    </label>
                    <input
                      className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 ${!cepValid ? 'bg-gray-100 border-gray-300 text-gray-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'}`}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      disabled
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado *
                    </label>
                    <input
                      className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 ${!cepValid ? 'bg-gray-100 border-gray-300 text-gray-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'}`}
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      disabled
                      required
                    />
                  </div>
                </div>

                {/* Bloco de verificação de endereço removido: CEP já realiza autofill e bloqueio visual */}
              </div>
            )}

            {/* Step 3: Details */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Detalhes do imóvel</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quartos
                    </label>
                    <input
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      type="number"
                      placeholder="3"
                      value={bedrooms}
                      onChange={(e) => setBedrooms(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Banheiros
                    </label>
                    <input
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      type="number"
                      step="0.5"
                      placeholder="2"
                      value={bathrooms}
                      onChange={(e) => setBathrooms(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Área (m²)
                    </label>
                    <input
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      type="number"
                      placeholder="120"
                      value={areaM2}
                      onChange={(e) => setAreaM2(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Images */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Fotos do imóvel</h2>
                
                <div className="space-y-4">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={({ active, over }) => {
                      if (!over || active.id === over.id) return;
                      const ids = images.map((_, i) => `img-${i}`);
                      const oldIndex = ids.indexOf(String(active.id));
                      const newIndex = ids.indexOf(String(over.id));
                      if (oldIndex === -1 || newIndex === -1) return;
                      setImages((prev) => arrayMove(prev, oldIndex, newIndex));
                    }}
                  >
                    <SortableContext items={images.map((_, i) => `img-${i}`)} strategy={verticalListSortingStrategy}>
                  {images.map((img, idx) => (
                    <SortableItem key={`img-${idx}`} id={`img-${idx}`}>
                      <div className="border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">Imagem {idx + 1}</span>
                          <span className="text-xs text-gray-400 cursor-grab select-none" title="Arraste para reordenar">⋮⋮</span>
                        </div>
                        {images.length > 1 && (
                          <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                            className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50"
                            aria-label={`Remover imagem ${idx + 1}`}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          {/* Upload via Cloudinary */}
                          <div className="mt-3 flex items-center gap-3">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  setToast({ message: "Enviando imagem...", type: "info" });
                                  const sigRes = await fetch('/api/upload/cloudinary-sign', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ folder: 'zillowlike' }),
                                  });
                                  if (!sigRes.ok) throw new Error('Falha ao assinar upload.');
                                  const sig = await sigRes.json();
                                  const fd = new FormData();
                                  fd.append('file', file);
                                  fd.append('api_key', sig.apiKey);
                                  fd.append('timestamp', String(sig.timestamp));
                                  fd.append('signature', sig.signature);
                                  fd.append('folder', sig.folder);
                                  const up = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: 'POST', body: fd });
                                  const data = await up.json();
                                  if (!up.ok || !data.secure_url) throw new Error('Upload falhou.');
                                  setImages((prev) => prev.map((it, i) => (i === idx ? { ...it, url: data.secure_url } : it)));
                                  setToast({ message: 'Imagem enviada!', type: 'success' });
                                } catch (err: any) {
                                  setToast({ message: err?.message || 'Erro no upload.', type: 'error' });
                                }
                              }}
                            />
                          </div>
                          {/* Preview */}
                          {img.url && (
                            <div className="mt-3">
                              <img
                                src={img.url}
                                alt={img.alt || `Pré-visualização ${idx + 1}`}
                                className="w-full h-40 object-cover rounded-lg border"
                              />
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Descrição (opcional)
                          </label>
                          <input
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="Sala de estar"
                            value={img.alt || ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setImages((prev) => prev.map((it, i) => (i === idx ? { ...it, alt: v } : it)));
                            }}
                          />
                        </div>
                      </div>
                      </div>
                    </SortableItem>
                  ))}
                    </SortableContext>
                  </DndContext>
                </div>
                  <button
                    type="button"
                    onClick={() => setImages((imgs) => [...imgs, { url: "" }])}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
                  >
                    <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-gray-600">Adicionar mais fotos</span>
                  </button>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Anterior
              </button>
              
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
                >
                  Próximo
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-all duration-200"
                >
                  {isSubmitting ? "Publicando..." : "Publicar Imóvel"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}