"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis, restrictToParentElement, restrictToWindowEdges } from "@dnd-kit/modifiers";
import Link from "next/link";
import PropertyCardPremium from "@/components/modern/PropertyCardPremium";
import { geocodeAddress } from "@/lib/geocode";
import { PropertyCreateSchema } from "@/lib/schemas";
import Toast from "@/components/Toast";

type ImageInput = { url: string; alt?: string; useUrl?: boolean; pending?: boolean; error?: string };

export default function NewPropertyPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success"|"error"|"info" } | null>(null);
  const [submitIntent, setSubmitIntent] = useState(false);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceBRL, setPriceBRL] = useState("");
  const [type, setType] = useState("HOUSE");
  const [conditionTags, setConditionTags] = useState<string[]>([]);

  const [street, setStreet] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("Petrolina");
  const [state, setState] = useState("PE");
  const [postalCode, setPostalCode] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const numberInputRef = useRef<HTMLInputElement | null>(null);
  const [cepValid, setCepValid] = useState(false);
  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const confirmCancelRef = useRef<HTMLButtonElement | null>(null);
  const [images, setImages] = useState<ImageInput[]>([{ url: "", useUrl: false }]);
  const dragIndex = useRef<number | null>(null);
  const [isFileDragOver, setIsFileDragOver] = useState(false);

  const openLightbox = (i: number) => setLightbox({ open: true, index: i });
  const closeLightbox = () => setLightbox({ open: false, index: 0 });
  const nextLightbox = () => {
    setLightbox((lb) => {
      const n = images.length;
      if (!n) return { open: false, index: 0 };
      let j = lb.index;
      for (let k = 0; k < n; k++) {
        j = (j + 1) % n;
        if (images[j]?.url) break;
      }
      return { open: true, index: j };
    });
  };
  const prevLightbox = () => {
    setLightbox((lb) => {
      const n = images.length;
      if (!n) return { open: false, index: 0 };
      let j = lb.index;
      for (let k = 0; k < n; k++) {
        j = (j - 1 + n) % n;
        if (images[j]?.url) break;
      }
      return { open: true, index: j };
    });
  };

  useEffect(() => {
    if (!lightbox.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") nextLightbox();
      if (e.key === "ArrowLeft") prevLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox.open, images]);

  // Evita que soltar arquivo fora do dropzone navegue para a imagem
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        e.preventDefault();
      }
    };
    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        e.preventDefault();
      }
    };
    window.addEventListener('dragover', onDragOver as any);
    window.addEventListener('drop', onDrop as any);
    return () => {
      window.removeEventListener('dragover', onDragOver as any);
      window.removeEventListener('drop', onDrop as any);
    };
  }, []);

  async function handleDroppedFiles(fileList: FileList) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    for (const file of files) {
      // encontra primeiro slot vazio, senão adiciona novo
      let targetIndex = images.findIndex((it) => !it.url);
      if (targetIndex === -1) {
        setImages((prev) => [...prev, { url: "" }]);
        targetIndex = images.length;
      }
      const localUrl = URL.createObjectURL(file);
      setImages((prev) => prev.map((it, i) => (i === targetIndex ? { ...it, url: localUrl, pending: true, error: undefined } : it)));
      try {
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
        if (!up.ok || !data.secure_url) throw new Error(data?.error?.message || 'Upload falhou.');
        URL.revokeObjectURL(localUrl);
        setImages((prev) => prev.map((it, i) => (i === targetIndex ? { ...it, url: data.secure_url, pending: false, error: undefined } : it)));
      } catch (err) {
        // mantém preview local, mas sinaliza erro
        setToast({ message: 'Erro ao enviar imagem', type: 'error' });
        setImages((prev) => prev.map((it, i) => (i === targetIndex ? { ...it, pending: false, error: 'Falha no upload' } : it)));
      }
    }
  }

  useEffect(() => {
    if (confirmDelete.open) {
      // Foca botão cancelar quando modal abre
      setTimeout(() => confirmCancelRef.current?.focus(), 0);
    } else {
      // Restaura foco ao botão que abriu o modal
      lastFocusRef.current?.focus?.();
    }
  }, [confirmDelete.open]);

  const [bedrooms, setBedrooms] = useState<number | "">("");
  const [bathrooms, setBathrooms] = useState<number | "">("");
  const [areaM2, setAreaM2] = useState<number | "">("");
  const SAVE_KEY = "owner_new_draft";

  // dnd-kit: sensors e item ordenável
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function SortableItem({ id, children }: { id: string; children: ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition: transition || 'transform 200ms ease, opacity 200ms ease, box-shadow 200ms ease',
      opacity: isDragging ? 0.95 : 1,
      boxShadow: isDragging ? '0 12px 30px rgba(0,0,0,0.2)' : undefined,
      borderRadius: '0.75rem',
      cursor: isDragging ? 'grabbing' : 'grab',
    };
    return (
      <div ref={setNodeRef} style={style} className={isDragging ? 'ring-2 ring-blue-500 shadow-lg scale-105' : ''} {...attributes} {...listeners}>
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
    if (!submitIntent) {
      // Evita submits involuntários causados por Enter ou interações não intencionais
      return;
    }
    setSubmitIntent(false);
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
        conditionTags,
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
    <>
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

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
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

          <form onSubmit={handleSubmit} onKeyDown={(e) => { if ((e as any).key === 'Enter' && currentStep < 4) { e.preventDefault(); } }} className="space-y-8">
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
                
                <div
                  className={`space-y-4 ${isFileDragOver ? 'ring-2 ring-blue-400 rounded-lg' : ''}`}
                  onDragOver={(e) => {
                    if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
                      e.preventDefault();
                      setIsFileDragOver(true);
                    }
                  }}
                  onDragLeave={(e) => {
                    setIsFileDragOver(false);
                  }}
                  onDrop={(e) => {
                    if (e.dataTransfer && e.dataTransfer.files?.length) {
                      e.preventDefault();
                      setIsFileDragOver(false);
                      handleDroppedFiles(e.dataTransfer.files);
                    }
                  }}
                >
                  <div className={`w-full rounded-lg border-2 border-dashed ${isFileDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'} p-6 text-center`}
                       onClick={() => setImages((imgs) => [...imgs, { url: "" }])}
                       role="button" tabIndex={0}
                  >
                    <div className="flex items-center justify-center gap-3 text-gray-600">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      <span className="text-sm">Arraste suas imagens aqui ou clique para adicionar</span>
                    </div>
                  </div>
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
                            onClick={(e) => { lastFocusRef.current = e.currentTarget as HTMLElement; setConfirmDelete({ open: true, index: idx }); }}
                            className="inline-flex items-center text-red-600 hover:text-red-700 p-2 rounded-md hover:bg-red-50"
                            aria-label={`Remover imagem ${idx + 1}`}
                            title="Remover"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                              <path d="M9 3a1 1 0 0 0-1 1v1H5.5a1 1 0 1 0 0 2H6v11a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7h.5a1 1 0 1 0 0-2H16V4a1 1 0 0 0-1-1H9zm2 3V5h2v1h-2zM8 7h8v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V7z" />
                            </svg>
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
                                  // Preview local imediato
                                  const localUrl = URL.createObjectURL(file);
                                  setImages((prev) => prev.map((it, i) => (i === idx ? { ...it, url: localUrl, pending: true, error: undefined } : it)));
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
                                  URL.revokeObjectURL(localUrl);
                                  setImages((prev) => prev.map((it, i) => (i === idx ? { ...it, url: data.secure_url, pending: false, error: undefined } : it)));
                                  setToast({ message: 'Imagem enviada!', type: 'success' });
                                } catch (err: any) {
                                  setToast({ message: err?.message || 'Erro no upload.', type: 'error' });
                                  setImages((prev) => prev.map((it, i) => (i === idx ? { ...it, pending: false, error: 'Falha no upload' } : it)));
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
                              {img.pending && (
                                <div className="mt-2 text-xs text-gray-500">Enviando...</div>
                              )}
                              {img.error && (
                                <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-red-50 text-red-700 text-xs px-2 py-1 border border-red-200">
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                                  <span>{img.error}</span>
                                </div>
                              )}
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
                  {images.some((it) => it.url && it.url.trim().length > 0) && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Pré-visualização</h3>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        modifiers={[restrictToParentElement, restrictToWindowEdges]}
                        onDragEnd={({ active, over }) => {
                          if (!over || active.id === over.id) return;
                          const ids = images.map((_, i) => `thumb-${i}`);
                          const oldIndex = ids.indexOf(String(active.id));
                          const newIndex = ids.indexOf(String(over.id));
                          if (oldIndex === -1 || newIndex === -1) return;
                          setImages((prev) => arrayMove(prev, oldIndex, newIndex));
                        }}
                      >
                        <SortableContext items={images.map((img, i) => img.url ? `thumb-${i}` : null).filter(Boolean) as string[]} strategy={verticalListSortingStrategy}>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {images.map((img, i) => (
                              img.url ? (
                                <SortableItem key={`thumb-${i}`} id={`thumb-${i}`}>
                                  <div className="group relative overflow-hidden rounded-lg border bg-white cursor-pointer" onClick={() => openLightbox(i)}>
                                    <img
                                      src={img.url}
                                      alt={img.alt || `Pré-visualização ${i + 1}`}
                                      className="w-full h-32 object-cover group-hover:opacity-95"
                                      draggable={false}
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); lastFocusRef.current = e.currentTarget as HTMLElement; setConfirmDelete({ open: true, index: i }); }}
                                        className="p-2 rounded-md bg-white/80 hover:bg-white text-red-600 shadow"
                                        aria-label="Remover imagem"
                                        title="Remover"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                          <path d="M9 3a1 1 0 0 0-1 1v1H5.5a1 1 0 1 0 0 2H6v11a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7h.5a1 1 0 1 0 0-2H16V4a1 1 0 0 0-1-1H9zm2 3V5h2v1h-2zM8 7h8v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V7z" />
                                        </svg>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setImages((prev) => arrayMove(prev, i, 0)); }}
                                        className="p-2 rounded-md bg-white/80 hover:bg-white text-yellow-600 shadow"
                                        aria-label="Definir capa"
                                        title="Definir capa"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                          <path d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.787 1.401 8.168L12 18.896l-7.335 3.87 1.401-8.168L.132 9.211l8.2-1.193L12 .587z"/>
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                </SortableItem>
                              ) : null
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  )}
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
                  onClick={() => setSubmitIntent(true)}
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
          <aside className="hidden lg:block lg:col-span-1 sticky top-6 self-start">
            <PropertyCardPremium
              property={{
                id: 'preview',
                title: title || 'Título do anúncio',
                price: parseBRLToNumber(priceBRL) * 100,
                images: images.filter((i)=>i.url).map((i)=>({ url: i.url })),
                city,
                state,
                bedrooms: bedrooms === '' ? undefined : Number(bedrooms),
                bathrooms: bathrooms === '' ? undefined : Number(bathrooms),
                areaM2: areaM2 === '' ? undefined : Number(areaM2),
                neighborhood,
                conditionTags,
                type,
              }}
            />
          </aside>
        </div>
      </div>
    </div>
    {lightbox.open && images[lightbox.index]?.url && (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={closeLightbox}>
        <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
          <img
            src={images[lightbox.index].url}
            alt={images[lightbox.index].alt || `Imagem ${lightbox.index + 1}`}
            className="w-full max-h-[80vh] object-contain rounded-lg shadow-2xl bg-black"
          />
          <button onClick={closeLightbox} className="absolute top-3 right-3 p-2 rounded-md bg-white/80 hover:bg-white shadow" aria-label="Fechar">
            ✕
          </button>
          <button onClick={(e) => { e.stopPropagation(); prevLightbox(); }} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow" aria-label="Anterior">‹</button>
          <button onClick={(e) => { e.stopPropagation(); nextLightbox(); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow" aria-label="Próxima">›</button>
        </div>
      </div>
    )}
    {confirmDelete.open && confirmDelete.index !== null && (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setConfirmDelete({ open: false, index: null })}>
        <div className="relative w-full max-w-sm rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-base font-semibold text-gray-900 mb-2">Remover imagem?</h3>
          <p className="text-sm text-gray-600 mb-4">Essa ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-3">
            <button ref={confirmCancelRef} type="button" className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={() => setConfirmDelete({ open: false, index: null })}>Cancelar</button>
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (confirmDelete.index !== null) {
                  setImages((prev) => prev.filter((_, idx) => idx !== confirmDelete.index));
                }
                setConfirmDelete({ open: false, index: null });
              }}
            >
              Remover
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}