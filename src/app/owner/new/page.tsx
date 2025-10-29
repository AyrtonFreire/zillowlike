"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Home, Building2, Landmark, Building, Warehouse, House, Camera, Image as ImageIcon, MapPin as MapPinIcon, MessageCircle, Phone } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis, restrictToParentElement, restrictToWindowEdges } from "@dnd-kit/modifiers";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import PropertyCardPremium from "@/components/modern/PropertyCardPremium";
import { geocodeAddressParts } from "@/lib/geocode";
import { PropertyCreateSchema } from "@/lib/schemas";
import Toast from "@/components/Toast";

type ImageInput = { url: string; alt?: string; useUrl?: boolean; pending?: boolean; error?: string; editing?: boolean; progress?: number; reserved?: boolean; file?: File };

export default function NewPropertyPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success"|"error"|"info" } | null>(null);
  const [submitIntent, setSubmitIntent] = useState(false);
  
  const [title, setTitle] = useState(""); // gerado via botão + fallback automático no submit
  const [description, setDescription] = useState("");
  const [priceBRL, setPriceBRL] = useState("");
  const [type, setType] = useState("HOUSE");
  const [purpose, setPurpose] = useState<"SALE"|"RENT"|"">("");
  const [conditionTags, setConditionTags] = useState<string[]>([]);
  const [featureSuggestions, setFeatureSuggestions] = useState<string[]>([]);
  const [condoFeeBRL, setCondoFeeBRL] = useState("");
  const [iptuYearBRL, setIptuYearBRL] = useState("");
  // Optional extended details
  const [parkingSpots, setParkingSpots] = useState<string | number>("");
  const [suites, setSuites] = useState<string | number>("");
  const [floor, setFloor] = useState<string | number>("");
  const [totalFloors, setTotalFloors] = useState<string | number>("");
  const [hasElevator, setHasElevator] = useState(false);
  const [hasBalcony, setHasBalcony] = useState(false);
  const [hasGourmet, setHasGourmet] = useState(false);
  const [hasPool, setHasPool] = useState(false);
  const [hasGym, setHasGym] = useState(false);
  const [hasPlayground, setHasPlayground] = useState(false);
  const [hasPartyRoom, setHasPartyRoom] = useState(false);
  const [hasConcierge24h, setHasConcierge24h] = useState(false);
  const [sunOrientation, setSunOrientation] = useState(""); // nascente/poente
  const [yearBuilt, setYearBuilt] = useState<string | number>("");
  const [yearRenovated, setYearRenovated] = useState<string | number>("");
  const [sunByRoomNote, setSunByRoomNote] = useState("");
  // Extra grouped toggles
  const [accRamps, setAccRamps] = useState(false);
  const [accWideDoors, setAccWideDoors] = useState(false);
  const [accAccessibleElevator, setAccAccessibleElevator] = useState(false);
  const [accTactile, setAccTactile] = useState(false);
  const [comfortAC, setComfortAC] = useState(false);
  const [comfortHeating, setComfortHeating] = useState(false);
  const [comfortSolar, setComfortSolar] = useState(false);
  const [comfortNoiseWindows, setComfortNoiseWindows] = useState(false);
  const [comfortLED, setComfortLED] = useState(false);
  const [comfortWaterReuse, setComfortWaterReuse] = useState(false);
  const [finishFloor, setFinishFloor] = useState(''); // porcelanato/madeira/vinílico
  const [finishCabinets, setFinishCabinets] = useState(false);
  const [finishCounterGranite, setFinishCounterGranite] = useState(false);
  const [finishCounterQuartz, setFinishCounterQuartz] = useState(false);
  const [viewSea, setViewSea] = useState(false);
  const [viewCity, setViewCity] = useState(false);
  const [positionFront, setPositionFront] = useState(false); // frente
  const [positionBack, setPositionBack] = useState(false); // fundos
  const [petsSmall, setPetsSmall] = useState(false);
  const [petsLarge, setPetsLarge] = useState(false);
  const [condoRules, setCondoRules] = useState('');
  const [secCCTV, setSecCCTV] = useState(false);
  const [secSallyPort, setSecSallyPort] = useState(false);
  const [secNightGuard, setSecNightGuard] = useState(false);
  const [secElectricFence, setSecElectricFence] = useState(false);
  // Accordion visibility
  const [openAcc, setOpenAcc] = useState<{[k:string]:boolean}>({});

  // Auto-open accordions if any inner field is filled
  useEffect(() => {
    const next = { ...openAcc } as any;
    const accFilled = accRamps || accWideDoors || accAccessibleElevator || accTactile;
    if (accFilled) next.acc_acc = true;
    const ceFilled = comfortAC || comfortHeating || comfortSolar || comfortNoiseWindows || comfortLED || comfortWaterReuse;
    if (ceFilled) next.acc_ce = true;
    const finFilled = !!finishFloor || finishCabinets || finishCounterGranite || finishCounterQuartz;
    if (finFilled) next.acc_fin = true;
    const viewFilled = viewSea || viewCity || positionFront || positionBack || !!sunByRoomNote;
    if (viewFilled) next.acc_view = true;
    const petsFilled = petsSmall || petsLarge || !!condoRules;
    if (petsFilled) next.acc_pets = true;
    const secFilled = secCCTV || secSallyPort || secNightGuard || secElectricFence;
    if (secFilled) next.acc_sec = true;
    setOpenAcc(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accRamps, accWideDoors, accAccessibleElevator, accTactile, comfortAC, comfortHeating, comfortSolar, comfortNoiseWindows, comfortLED, comfortWaterReuse, finishFloor, finishCabinets, finishCounterGranite, finishCounterQuartz, viewSea, viewCity, positionFront, positionBack, sunByRoomNote, petsSmall, petsLarge, condoRules, secCCTV, secSallyPort, secNightGuard, secElectricFence]);
  const TAG_OPTIONS: string[] = useMemo(() => [
    "Novo",
    "Condomínio",
    "Aceita pets",
    "Aceita permuta",
    "Mobiliado",
    "Semi-mobiliado",
    "Em obras",
    "Em construção",
    "Na planta",
    "Reformado",
    "Pronto para morar",
  ], []);

  // Conflicts map (simple opposites)
  const CONFLICTS: Record<string, string[]> = {
    "Mobiliado": ["Não mobiliado", "Semi-mobiliado"],
    "Não mobiliado": ["Mobiliado", "Semi-mobiliado"],
    "Aceita pets": ["Não aceita pets"],
    "Não aceita pets": ["Aceita pets"],
  };

  function hasConflict(tag: string, current: string[]): string | null {
    const opps = CONFLICTS[tag] || [];
    const found = current.find((t) => opps.includes(t));
    return found || null;
  }

  // Heurística: sugerir capa movendo imagem com nome/fachada
  function suggestCover() {
    const keys = ['fachada', 'frente', 'exterior', 'frontal', 'fachada-', 'frente-'];
    const idx = images.findIndex((img) => {
      const url = img.url || '';
      const lower = url.toLowerCase();
      return keys.some(k => lower.includes(k));
    });
    if (idx > 0) {
      setImages((prev) => {
        const arr = [...prev];
        const [item] = arr.splice(idx, 1);
        arr.unshift(item);
        return arr;
      });
      setToast({ message: 'Capa sugerida aplicada.', type: 'info' });
    } else {
      setToast({ message: 'Não encontramos uma fachada claramente identificada. Ajuste manualmente se desejar.', type: 'info' });
    }
  }

  // Completion indicator (simple): percent of key fields filled
  function completionPercent(): number {
    let total = 0; let ok = 0;
    const add = (cond: boolean) => { total++; if (cond) ok++; };
    add(!!purpose);
    add(parseBRLToNumber(priceBRL) > 0);
    add(!!type);
    add(!!geo);
    add(bedrooms !== '' || bathrooms !== '' || areaM2 !== '');
    add(images.some(i => i.url));
    return Math.round((ok / total) * 100);
  }

  function toggleTag(tag: string) {
    setConditionTags((prev) => {
      const has = prev.includes(tag);
      if (has) return [];
      // Limite: 1 tag selecionada
      const conflict = hasConflict(tag, prev);
      if (conflict) {
        setToast({ message: `Conflito com "${conflict}". Remova o conflito ou escolha outra opção.`, type: 'error' });
        return prev;
      }
      return [tag];
    });
  }

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
  const dropInputRef = useRef<HTMLInputElement | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  // Tips toggle (persisted)
  const [showTips, setShowTips] = useState<boolean>(false);
  const [showWatermark, setShowWatermark] = useState<boolean>(false);
  const [contactMode, setContactMode] = useState<'DIRECT' | 'BROKER'>('DIRECT');
  const [contactPrefs, setContactPrefs] = useState<{ preferredHours?: string; chatFirst?: boolean; noCall?: boolean }>({ chatFirst: true });
  // Leaflet
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMap = useRef<any>(null);
  const leafletMarker = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

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
    // Tips preference
    try {
      const pref = localStorage.getItem("owner_post_tips");
      if (pref !== null) setShowTips(pref === "1");
    } catch {}
    // Load Leaflet once
    (async () => {
      if (typeof window === 'undefined') return;
      if ((window as any).L) { setLeafletLoaded(true); return; }
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setLeafletLoaded(true);
      document.body.appendChild(script);
    })();
    if (!lightbox.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") nextLightbox();
      if (e.key === "ArrowLeft") prevLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox.open, images]);

  // Persist tips preference
  useEffect(() => {
    try { localStorage.setItem("owner_post_tips", showTips ? "1" : "0"); } catch {}
  }, [showTips]);

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

  // Initialize/Update Leaflet map when on Step 2 and geo available
  useEffect(() => {
    if (!leafletLoaded || currentStep !== 2) return;
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;
    // Create map once
    if (!leafletMap.current) {
      const center = geo ? [geo.lat, geo.lng] : [-9.3986, -40.5017]; // Petrolina as default
      leafletMap.current = L.map(mapContainerRef.current).setView(center, 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(leafletMap.current);
    }
    // Ensure marker exists only when we have a house number
    if (geo && addressNumber && !leafletMarker.current) {
      leafletMarker.current = (window as any).L.marker([geo.lat, geo.lng], { draggable: true }).addTo(leafletMap.current);
      leafletMarker.current.on('dragend', () => {
        const p = leafletMarker.current.getLatLng();
        setGeo({ lat: p.lat, lng: p.lng });
      });
    }
    // Sync marker/center on geo change
    if (geo) {
      // Always center map
      leafletMap.current.setView([geo.lat, geo.lng]);
      // Update marker position only if it exists
      if (leafletMarker.current) {
        leafletMarker.current.setLatLng([geo.lat, geo.lng]);
      }
    }
  }, [leafletLoaded, currentStep, geo]);

  // Helper to geocode with or without number
  async function geocodeNow(withNumber: boolean) {
    if (!street || !city || !state) return;
    setIsGeocoding(true);
    try {
      const result = await geocodeAddressParts({
        street,
        number: withNumber ? addressNumber : '',
        neighborhood,
        city,
        state,
        postalCode,
      });
      if (result && result.lat && result.lng) {
        setGeo({ lat: result.lat, lng: result.lng });
        // if we don't have number, ensure no marker yet
        if (!withNumber && leafletMarker.current && leafletMap.current) {
          try { leafletMap.current.removeLayer(leafletMarker.current); } catch {}
          leafletMarker.current = null;
        }
      }
    } catch (e) {
      console.error('Auto geocode failed', e);
    } finally {
      setIsGeocoding(false);
    }
  }

  // When CEP becomes valid (and street/city are filled), center map on the street (no marker)
  useEffect(() => {
    if (currentStep !== 2) return;
    if (!cepValid || !postalCode) return;
    if (!street || !city || !state) return;
    // geocode without number
    geocodeNow(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, cepValid, postalCode, street, city, state]);

  // When number is provided, place/update marker precisely on the address
  useEffect(() => {
    if (currentStep !== 2) return;
    if (!cepValid || !postalCode) return;
    if (!addressNumber || String(addressNumber).trim() === '') return;
    geocodeNow(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, cepValid, postalCode, addressNumber]);

  // Paste-from-clipboard support (Step 4)
  useEffect(() => {
    if (currentStep !== 4) return;
    const onPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const it of Array.from(items)) {
        if (it.kind === 'file') {
          const blob = it.getAsFile();
          if (blob && blob.type.startsWith('image/')) {
            files.push(new File([blob], `pasted-${Date.now()}.png`, { type: blob.type }));
          }
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        await handleDroppedFiles(files);
      }
    };
    window.addEventListener('paste', onPaste as any);
    return () => window.removeEventListener('paste', onPaste as any);
  }, [currentStep, images]);

  function toFiles(list: FileList | File[]): File[] {
    if (Array.isArray(list)) return list as File[];
    return Array.from(list) as File[];
  }

  async function handleDroppedFiles(fileList: FileList | File[]) {
    const files: File[] = toFiles(fileList).filter((f: File) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    // 1) Determinar índices-alvo: sempre APPEND para evitar colisões/off-by-one
    const startIndex = (!images.length || (images.length === 1 && !images[0].url)) ? 0 : images.length;
    const targetIndices: number[] = Array.from({ length: files.length }, (_, k) => startIndex + k);
    // Se havia apenas 1 slot vazio inicial, substituí-lo por placeholders
    if (images.length === 1 && !images[0].url) {
      setImages(() => files.map(() => ({ url: "", reserved: true })) as ImageInput[]);
    } else {
      setImages((prev) => [...prev, ...files.map(() => ({ url: "", reserved: true }))]);
    }
    // 2) Upload sequencial preenchendo cada índice
    for (let k = 0; k < files.length; k++) {
      const file = files[k];
      const targetIndex = targetIndices[k];
      const localUrl = URL.createObjectURL(file as File);
      setImages((prev) => prev.map((it, i) => (i === targetIndex ? { ...it, url: localUrl, pending: true, error: undefined, progress: 1, reserved: true, file } : it)));
      try {
        const sigRes = await fetch('/api/upload/cloudinary-sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder: 'zillowlike' }) });
        if (!sigRes.ok) throw new Error('Falha ao assinar upload.');
        const sig = await sigRes.json();
        // Checagem básica de qualidade
        try {
          const imgMeta = await new Promise<{ w: number; h: number }>((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ w: img.width, h: img.height });
            img.src = localUrl;
          });
          const portrait = imgMeta.h > imgMeta.w;
          const lowRes = imgMeta.w < 800 || imgMeta.h < 600;
          if (portrait) setToast({ message: 'Foto vertical detectada. Prefira horizontais para melhor vitrine.', type: 'info' });
          if (lowRes) setToast({ message: 'Foto com baixa resolução. Pode impactar a visibilidade.', type: 'info' });
        } catch {}
        const fd = new FormData();
        fd.append('file', file as File);
        fd.append('api_key', sig.apiKey);
        fd.append('timestamp', String(sig.timestamp));
        fd.append('signature', sig.signature);
        fd.append('folder', sig.folder);
        // XHR para acompanhar progresso
        const uploadedUrl: string = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`);
          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) {
              const pct = Math.min(99, Math.round((ev.loaded / ev.total) * 100));
              setImages((prev) => prev.map((it, i) => (i === targetIndex ? { ...it, progress: pct } : it)));
            }
          };
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
              try {
                const data = JSON.parse(xhr.responseText || '{}');
                if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
                  resolve(data.secure_url as string);
                } else {
                  reject(new Error(data?.error?.message || 'Upload falhou.'));
                }
              } catch (e) {
                reject(new Error('Upload falhou.'));
              }
            }
          };
          xhr.onerror = () => reject(new Error('Falha de rede no upload.'));
          xhr.send(fd);
        });
        URL.revokeObjectURL(localUrl);
        setImages((prev) => prev.map((it, i) => (i === targetIndex ? { ...it, url: uploadedUrl, pending: false, error: undefined, progress: 100, reserved: false, file: undefined } : it)));
      } catch (err) {
        // mantém preview local, mas sinaliza erro
        setToast({ message: 'Erro ao enviar imagem', type: 'error' });
        setImages((prev) => prev.map((it, i) => (i === targetIndex ? { ...it, pending: false, error: 'Falha no upload', progress: undefined, reserved: false } : it)));
      }
    }
  }

  async function retryUpload(targetIndex: number) {
    const item = images[targetIndex];
    const file = item?.file;
    if (!file) return;
    try {
      const localUrl = URL.createObjectURL(file);
      setImages((prev) => prev.map((it, i) => (i === targetIndex ? { ...it, url: localUrl, pending: true, error: undefined, progress: 1 } : it)));
      const sigRes = await fetch('/api/upload/cloudinary-sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder: 'zillowlike' }) });
      if (!sigRes.ok) throw new Error('Falha ao assinar upload.');
      const sig = await sigRes.json();
      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', sig.apiKey);
      fd.append('timestamp', String(sig.timestamp));
      fd.append('signature', sig.signature);
      fd.append('folder', sig.folder);
      const uploadedUrl: string = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.min(99, Math.round((ev.loaded / ev.total) * 100));
            setImages((prev) => prev.map((it, i) => (i === targetIndex ? { ...it, progress: pct } : it)));
          }
        };
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            try {
              const data = JSON.parse(xhr.responseText || '{}');
              if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
                resolve(data.secure_url as string);
              } else {
                reject(new Error(data?.error?.message || 'Upload falhou.'));
              }
            } catch (e) {
              reject(new Error('Upload falhou.'));
            }
          }
        };
        xhr.onerror = () => reject(new Error('Falha de rede no upload.'));
        xhr.send(fd);
      });
      URL.revokeObjectURL(localUrl);
      setImages((prev) => prev.map((it, i) => (i === targetIndex ? { ...it, url: uploadedUrl, pending: false, error: undefined, progress: 100, file: undefined } : it)));
    } catch (e) {
      setToast({ message: 'Erro ao enviar imagem', type: 'error' });
      setImages((prev) => prev.map((it, i) => (i === targetIndex ? { ...it, pending: false, error: 'Falha no upload', progress: undefined } : it)));
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

  // Helper: limpa todos os campos para um novo cadastro
  const resetForm = () => {
    setCurrentStep(1);
    setIsSubmitting(false);
    setToast(null);
    setSubmitIntent(false);
    setTitle("");
    setDescription("");
    setPriceBRL("");
    setType("HOUSE");
    setConditionTags([]);
    setStreet("");
    setNeighborhood("");
    setCity("Petrolina");
    setState("PE");
    setPostalCode("");
    setAddressNumber("");
    setBedrooms("");
    setBathrooms("");
    setAreaM2("");
    setImages([{ url: "", useUrl: false }]);
    setGeo(null);
    setGeoPreview("");
    setCepValid(false);
    if (typeof window !== "undefined") {
      try { window.localStorage.removeItem(SAVE_KEY); } catch {}
    }
  };

  // Garante formulário limpo quando a página monta e quando volta do bfcache
  useEffect(() => {
    resetForm();
    const onPageShow = (e: any) => {
      if (e && e.persisted) resetForm();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("pageshow", onPageShow);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("pageshow", onPageShow);
      }
    };
  }, []);

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
      if (d.description) setDescription(d.description);
      if (d.priceBRL) setPriceBRL(d.priceBRL);
      if (d.type) setType(d.type);
      if (d.purpose) setPurpose(d.purpose);
      if (d.street) setStreet(d.street);
      if (d.neighborhood) setNeighborhood(d.neighborhood);
      if (d.city) setCity(d.city);
      if (d.state) setState(d.state);
      if (d.postalCode) setPostalCode(d.postalCode);
      if (typeof d.bedrooms !== 'undefined') setBedrooms(d.bedrooms);
      if (typeof d.bathrooms !== 'undefined') setBathrooms(d.bathrooms);
      if (typeof d.areaM2 !== 'undefined') setAreaM2(d.areaM2);
      if (Array.isArray(d.images)) setImages(d.images);
      if (Array.isArray(d.conditionTags)) setConditionTags(d.conditionTags);
    } catch {}
  }, []);

  // Autosave draft (debounced)
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const payload = {
          description, priceBRL, type, purpose,
          street, neighborhood, city, state, postalCode,
          bedrooms, bathrooms, areaM2, images, addressNumber,
          conditionTags,
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      } catch {}
    }, 400);
    return () => clearTimeout(id);
  }, [description, priceBRL, type, purpose, street, neighborhood, city, state, postalCode, bedrooms, bathrooms, areaM2, images, conditionTags]);

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
      [street && addressNumber ? `${street}, ${addressNumber}` : street, neighborhood, city, state, postalCode]
        .filter(Boolean)
        .join(", "),
    [street, addressNumber, neighborhood, city, state, postalCode]
  );

  const steps = [
    { id: 1, name: "Informações básicas", description: "Título, preço e tipo" },
    { id: 2, name: "Localização", description: "Endereço completo" },
    { id: 3, name: "Detalhes", description: "Quartos, banheiros e área" },
    { id: 4, name: "Fotos", description: "Imagens do imóvel" },
    { id: 5, name: "Revisão", description: "Conferir dados e publicar" },
  ];

  function tipsForStep(step: number): string[] {
    switch (step) {
      case 1:
        return [
          "Defina Venda ou Aluguel primeiro para orientar os campos.",
          "Preço sem centavos: use pontos para milhares (ex.: 450.000).",
          "Escolha o tipo certo (Casa, Apto, etc.) para filtros funcionarem bem.",
        ];
      case 2:
        return [
          "Use um CEP válido para preencher rua/bairro automaticamente.",
          "Se o número ainda não existe, deixe em branco e valide o CEP mesmo assim.",
          "Clique em Validar/Próximo para geolocalizar e melhorar a busca no mapa.",
        ];
      case 3:
        return [
          "Informe quartos/banheiros/área quando souber: ajuda o interessado a decidir.",
          "Tags como 'Reformado', 'Vaga coberta' e 'Varanda' aumentam relevância.",
          "Evite números exagerados; transparência gera melhores contatos.",
        ];
      case 4:
        return [
          "Adicione ao menos 1 foto; 8–15 fotos boas geram mais visitas.",
          "Prefira luz natural; mantenha os ambientes organizados.",
          "Arraste para ordenar; dá destaque às melhores fotos primeiro.",
        ];
      default:
        return [];
    }
  }

  async function handleGeocode() {
    if (!addressString) return;
    setIsGeocoding(true);
    try {
      const result = await geocodeAddressParts({
        street,
        number: addressNumber,
        neighborhood,
        city,
        state,
        postalCode,
      });
      if (result) {
        setGeo({ lat: result.lat, lng: result.lng });
        setGeoPreview(result.displayName || `${result.lat},${result.lng}`);
      } else {
        setGeo(null);
        setGeoPreview("");
      }
    } finally {
      setIsGeocoding(false);
    }
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
      // Impede publicar enquanto houver uploads pendentes
      if (images.some((img) => img.pending)) {
        setToast({ message: "Aguarde terminar o envio das imagens antes de publicar.", type: "error" });
        setCurrentStep(4);
        return;
      }
      // Exige ao menos uma imagem válida
      const hasAtLeastOneImage = images.some((img) => img.url && img.url.trim().length > 0);
      if (!hasAtLeastOneImage) {
        setToast({ message: "Adicione pelo menos uma foto do imóvel.", type: "error" });
        setCurrentStep(4);
        return;
      }

      // Não valida endereço no Step 4: apenas impede e volta para Step 2 se faltou geocodificar
      if (!geo) {
        setToast({ message: "Valide o endereço no passo de Localização antes de publicar.", type: "error" });
        setCurrentStep(2);
        return;
      }

      // Validar finalidade
      if (!purpose) {
        setToast({ message: "Selecione se é Venda ou Aluguel.", type: "error" });
        setCurrentStep(1);
        return;
      }

      // título gerado automaticamente (não exibido ao usuário)
      const typeLabel = type === 'HOUSE' ? 'Casa' : type === 'APARTMENT' ? 'Apartamento' : type === 'CONDO' ? 'Condomínio' : type === 'LAND' ? 'Terreno' : type === 'COMMERCIAL' ? 'Comercial' : type === 'STUDIO' ? 'Studio' : 'Imóvel';
      const purposeLabel = purpose === 'RENT' ? 'Aluguel' : 'Venda';
      const autoTitle = `${typeLabel} ${purposeLabel}${city && state ? ` - ${city}/${state}` : ''}`.trim();

      const payload = {
        title: autoTitle,
        description,
        priceBRL: parseBRLToNumber(priceBRL),
        type,
        purpose,
        address: { street, neighborhood, city, state, postalCode, number: addressNumber || undefined },
        geo: { lat: geo.lat, lng: geo.lng },
        details: {
          bedrooms: bedrooms === "" ? null : Number(bedrooms),
          bathrooms: bathrooms === "" ? null : Number(bathrooms),
          areaM2: areaM2 === "" ? null : Number(areaM2),
        },
        conditionTags,
        images: images
          .filter((img) => typeof img.url === 'string' && /^https?:\/\//.test(img.url))
          .map((img, i) => ({ url: img.url, alt: img.alt, sortOrder: i })),
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
        let msg = "Falha ao criar imóvel";
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
        setToast({ message: msg, type: "error" });
        return;
      }

      await res.json();
      setToast({ message: "Imóvel publicado com sucesso!", type: "success" });
      resetForm();
      window.location.href = "/?city=" + encodeURIComponent(city) + "&state=" + state;
    } finally {
      setIsSubmitting(false);
    }
  }

  const nextStep = async () => {
    // Step 1: validações básicas
    if (currentStep === 1) {
      if (!purpose) {
        setToast({ message: "Selecione a finalidade (Venda/Aluguel).", type: "error" });
        return;
      }
      const price = parseBRLToNumber(priceBRL);
      if (!price || price <= 0) {
        setToast({ message: "Informe um preço válido (maior que zero).", type: "error" });
        return;
      }
      if (!type) {
        setToast({ message: "Selecione o tipo de imóvel.", type: "error" });
        return;
      }
    }
    // Validação de endereço no Step 2 antes de avançar
    if (currentStep === 2) {
      // Campos obrigatórios: CEP válido, rua, bairro, cidade, estado
      if (!cepValid || !postalCode) {
        setToast({ message: "Informe um CEP válido.", type: "error" });
        return;
      }
      if (!street || !neighborhood || !city || !state) {
        setToast({ message: "Preencha rua, bairro, cidade e estado.", type: "error" });
        return;
      }
      setIsGeocoding(true);
      const res = await geocodeAddressParts({
        street,
        number: addressNumber || undefined, // opcional
        neighborhood,
        city,
        state,
        postalCode,
      });
      setIsGeocoding(false);
      if (!res) {
        setToast({ message: "Endereço não encontrado. Ajuste os dados ou tente um CEP diferente.", type: "error" });
        return;
      }
      setGeo({ lat: res.lat, lng: res.lng });
      setGeoPreview(res.displayName || `${res.lat},${res.lng}`);
    }
    // Step 3: sanidade dos números (quando fornecidos)
    if (currentStep === 3) {
      const invalidNum = (v: any) => typeof v === 'number' && (isNaN(v) || v < 0);
      if (invalidNum(bedrooms) || invalidNum(bathrooms) || invalidNum(areaM2)) {
        setToast({ message: "Valores de quartos, banheiros e área devem ser não negativos.", type: "error" });
        return;
      }
      if (typeof areaM2 === 'number' && areaM2 > 20000) {
        setToast({ message: "Área muito grande. Verifique o valor informado.", type: "error" });
        return;
      }
    }
    // Step 4: ao menos 1 imagem
    if (currentStep === 4) {
      const hasImage = images.some((it) => it.url && it.url.trim().length > 0);
      if (!hasImage) {
        setToast({ message: "Adicione ao menos uma foto do imóvel.", type: "error" });
        return;
      }
    }
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  function extractFeaturesFromText(text: string): string[] {
    const f: string[] = [];
    const add = (s: string) => {
      const t = s.trim();
      if (!t) return;
      if (!f.some((x) => x.toLowerCase() === t.toLowerCase())) f.push(t);
    };
    const lower = text.toLowerCase();
    const norm = lower.normalize('NFD').replace(/\p{Diacritic}/gu, '');

    // Helpers
    const title = (s: string) => s.replace(/(^|\s)\S/g, (m) => m.toUpperCase());
    const numWords: Record<string, number> = {
      'uma':1,'um':1,'duas':2,'dois':2,'três':3,'tres':3,'quatro':4,'cinco':5,'seis':6,'sete':7,'oito':8,'nove':9,'dez':10,
    };
    const wordToNum = (w: string) => numWords[w] ?? null;
    const findWordNum = (pattern: RegExp, txt: string) => {
      const m = pattern.exec(txt);
      if (!m) return null;
      const g = m[1];
      const n = Number(g);
      if (!isNaN(n)) return n;
      return wordToNum(g) ?? null;
    };

    // Quantitativos
    const suitesNum = findWordNum(/\b(\d{1,2}|uma|um|duas|dois|tres|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez)\s*(su[ií]tes?|suite)\b/i, norm);
    if (suitesNum) add(`${suitesNum} Suítes`);
    const vagasNum = findWordNum(/\b(\d{1,2}|uma|um|duas|dois|tres|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez)\s*(vagas?|garagens?)\b/i, norm);
    if (vagasNum) add(`${vagasNum} vagas de garagem`);
    const quartosNum = findWordNum(/\b(\d{1,2}|uma|um|duas|dois|tres|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez)\s*(quartos?|dormit[óo]rios?)\b/i, norm);
    if (quartosNum) add(`${quartosNum} Quartos`);
    const banhNum = findWordNum(/\b(\d{1,2}|uma|um|duas|dois|tres|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez)\s*(banheiros?)\b/i, norm);
    if (banhNum) add(`${banhNum} Banheiros`);
    if (/\b(lavabo|meio\s*banheiro|half\s*bath)\b/i.test(norm)) add('Lavabo');

    // Booleans comuns
    if (/pet\s*(friendly|aceito|permite)/i.test(norm)) add('Aceita pets');
    if (/(nao\s*aceita\s*pets|sem\s*pets)/i.test(norm)) add('Não aceita pets');
    if (/(mobiliado|mobilhado)/i.test(norm)) add('Mobiliado');
    if (/(nao\s*mobiliado|sem\s*moveis)/i.test(norm)) add('Não mobiliado');
    if (/(semi\s*-?mobiliado)/i.test(norm)) add('Semi-mobiliado');
    if (/(varanda\s*gourmet)/i.test(norm)) add('Varanda gourmet');
    if (/(varanda|terraco|terra[cç]o)/i.test(norm)) add('Varanda');
    if (/(churrasqueira)/i.test(lower)) add('Churrasqueira');
    if (/(piscina)/i.test(norm)) add('Piscina');
    if (/(academia|fitness)/i.test(lower)) add('Academia');
    if (/(elevador)/i.test(norm)) add('Elevador');
    if (/(sem\s*elevador)/i.test(norm)) add('Sem elevador');
    if (/(portaria\s*24h|24\s*h|seguranca\s*24)/i.test(norm)) add('Portaria 24h');
    if (/(closet)/i.test(lower)) add('Closet');
    if (/(escrit[óo]rio)/i.test(lower)) add('Escritório');
    if (/(lareira)/i.test(lower)) add('Lareira');
    if (/(pe-?direito\s*alto|teto\s*alto|soaring\s*ceilings)/i.test(norm)) add('Pé-direito alto');
    if (/(rooftop|terraco\s*na\s*cobertura)/i.test(norm)) add('Rooftop');
    if (/(jardim|garden)/i.test(norm)) add('Jardim');
    if (/(vista\s*mar|sea\s*view|vista\s*panoramica)/i.test(norm)) add('Vista panorâmica');
    if (/(reformado|reforma\s*recente)/i.test(norm)) add('Reformado');
    if (/(pronto\s*para\s*morar)/i.test(norm)) add('Pronto para morar');
    if (/(condominio\s*fechado)/i.test(norm)) add('Condomínio fechado');
    if (/(area\s*de\s*servico|lavanderia)/i.test(norm)) add('Área de serviço');
    if (/(gourmet)/i.test(norm)) add('Espaço gourmet');
    // Regionais e complementares
    if (/(sacada)/i.test(norm)) add('Sacada');
    if (/(quintal|patio)/i.test(norm)) add('Quintal');
    if (/(playground|brinquedoteca)/i.test(norm)) add('Playground');
    if (/(salao\s*de\s*festas)/i.test(norm)) add('Salão de festas');
    if (/(salao\s*de\s*jogos)/i.test(norm)) add('Salão de jogos');
    if (/(bicicletario)/i.test(norm)) add('Bicicletário');
    if (/(quadra\s*(poliesportiva|de\s*tenis))/i.test(norm)) add('Quadra esportiva');
    if (/(sauna)/i.test(norm)) add('Sauna');
    if (/(piscina\s*aquecida)/i.test(norm)) add('Piscina aquecida');
    if (/(pet\s*place)/i.test(norm)) add('Pet place');
    if (/(vaga\s*demarcada|garagem\s*coberta|vaga\s*coberta)/i.test(norm)) add('Vaga coberta');
    if (/(deposito|box\s*privativo)/i.test(norm)) add('Depósito privativo');
    if (/(despensa)/i.test(norm)) add('Despensa');
    if (/(energia\s*solar|placas?\s*solares)/i.test(norm)) add('Energia solar');
    if (/(gas\s*encanado)/i.test(norm)) add('Gás encanado');
    if (/(hidrometros?\s*individuais|agua\s*individualizada)/i.test(norm)) add('Água individual');
    if (/(rua\s*tranquila|cul-?de-?sac)/i.test(norm)) add('Rua tranquila');
    if (/(condominio\s*clube)/i.test(norm)) add('Condomínio clube');
    if (/(frente\s*mar|pe\s*na\s*areia|beira\s*mar)/i.test(norm)) add('Frente mar');
    if (/(home\s*office|escritorio\s*em\s*casa)/i.test(norm)) add('Home office');
    if (/(smart\s*home|automatica|automacao\s*residencial)/i.test(norm)) add('Automação residencial');

    // Title-case final, cap 12
    return f.slice(0, 12).map((s) => title(s));
  }

  

  return (
    <DashboardLayout
      title="Cadastrar Imóvel"
      description="Preencha as informações do seu imóvel para publicá-lo na plataforma."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Proprietário", href: "/owner/dashboard" },
        { label: "Novo Anúncio" },
      ]}
      actions={
        <Link
          href="/owner/properties"
          className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 border border-blue-100"
        >
          Meus Anúncios
        </Link>
      }
    >
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

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

            {/* Step 5: Review */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Revisão final</h2>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600" style={{ width: `${completionPercent()}%` }} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-xl p-4 ring-1 ring-black/5 bg-white/70 backdrop-blur-sm space-y-5 text-sm">
                    <div>
                      <div className="text-sm font-semibold text-gray-800 mb-1">Básico</div>
                      <ul className="list-disc ml-5 space-y-1">
                        <li>Finalidade: <span className="font-medium">{purpose === 'RENT' ? 'Aluguel' : 'Venda'}</span></li>
                        <li>Preço: <span className="font-medium">R$ {priceBRL || '—'}</span></li>
                        <li>Tipo: <span className="font-medium">{type}</span></li>
                        {conditionTags[0] && <li>Diferencial: {conditionTags[0]}</li>}
                      </ul>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-800 mb-1">Localização</div>
                      <ul className="list-disc ml-5 space-y-1">
                        <li>{street ? `${street}, ${addressNumber || ''}` : '—'}</li>
                        <li>{neighborhood ? `${neighborhood}, ` : ''}{city}/{state} — CEP {postalCode || '—'}</li>
                        <li>Geo: {geo ? `${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}` : '—'}</li>
                      </ul>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-800 mb-1">Detalhes</div>
                      <ul className="list-disc ml-5 space-y-1">
                        <li>Quartos: {bedrooms || '—'} • Banheiros: {bathrooms || '—'} • Área: {areaM2 || '—'} m²</li>
                        <li>Vagas: {parkingSpots || '—'} • Suítes: {suites || '—'}</li>
                        <li>Andar: {floor || '—'} / {totalFloors || '—'}</li>
                        <li>Varanda: {hasBalcony ? 'Sim' : 'Não'} • Elevador: {hasElevator ? 'Sim' : 'Não'}</li>
                        <li>Construção: {yearBuilt || '—'} • Reforma: {yearRenovated || '—'}</li>
                        {sunOrientation && <li>Orientação solar: {sunOrientation}</li>}
                      </ul>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-800 mb-1">Lazer/Condomínio</div>
                      <ul className="list-disc ml-5 space-y-1">
                        <li>{[hasPool && 'Piscina', hasGym && 'Academia', hasPlayground && 'Playground', hasPartyRoom && 'Salão de festas', hasGourmet && 'Espaço gourmet', hasConcierge24h && 'Portaria 24h'].filter(Boolean).join(' • ') || '—'}</li>
                      </ul>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-800 mb-1">Acessibilidade</div>
                      <ul className="list-disc ml-5 space-y-1">
                        <li>{[accRamps && 'Rampas', accWideDoors && 'Portas largas', accAccessibleElevator && 'Elevador acessível', accTactile && 'Sinalização tátil'].filter(Boolean).join(' • ') || '—'}</li>
                      </ul>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-800 mb-1">Conforto/Energia</div>
                      <ul className="list-disc ml-5 space-y-1">
                        <li>{[comfortAC && 'Ar-condicionado', comfortHeating && 'Aquecimento', comfortSolar && 'Aquecimento solar', comfortNoiseWindows && 'Janelas antirruído', comfortLED && 'Iluminação LED', comfortWaterReuse && 'Reuso de água'].filter(Boolean).join(' • ') || '—'}</li>
                      </ul>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-800 mb-1">Acabamentos</div>
                      <ul className="list-disc ml-5 space-y-1">
                        <li>{[finishFloor && `Piso: ${finishFloor}`, finishCabinets && 'Armários planejados', finishCounterGranite && 'Bancadas: granito', finishCounterQuartz && 'Bancadas: quartzo'].filter(Boolean).join(' • ') || '—'}</li>
                      </ul>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-800 mb-1">Vista/Posição</div>
                      <ul className="list-disc ml-5 space-y-1">
                        <li>{[viewSea && 'Vista mar', viewCity && 'Vista cidade', positionFront && 'Frente', positionBack && 'Fundos'].filter(Boolean).join(' • ') || '—'}</li>
                        {sunByRoomNote && <li>{sunByRoomNote}</li>}
                      </ul>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-800 mb-1">Pets/Políticas</div>
                      <ul className="list-disc ml-5 space-y-1">
                        <li>{[petsSmall && 'Pets pequeno porte', petsLarge && 'Pets grande porte'].filter(Boolean).join(' • ') || '—'}</li>
                        {condoRules && <li>{condoRules}</li>}
                      </ul>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-800 mb-1">Segurança</div>
                      <ul className="list-disc ml-5 space-y-1">
                        <li>{[secCCTV && 'CFTV', secSallyPort && 'Clausura', secNightGuard && 'Vigia noturno', secElectricFence && 'Cerca elétrica'].filter(Boolean).join(' • ') || '—'}</li>
                      </ul>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-gray-800 mb-1">Contato</div>
                      <ul className="list-disc ml-5 space-y-1">
                        <li>Modo: {contactMode === 'DIRECT' ? 'Contato direto' : 'Com apoio do corretor'}</li>
                        <li>Horários: {contactPrefs.preferredHours || '—'}</li>
                        <li>Chat primeiro: {contactPrefs.chatFirst ? 'Sim' : 'Não'} • Sem ligações: {contactPrefs.noCall ? 'Sim' : 'Não'}</li>
                      </ul>
                    </div>
                  </div>
                  <div className="rounded-xl p-4 ring-1 ring-black/5 bg-gradient-to-br from-white to-purple-50">
                    <div className="text-sm text-gray-600 mb-2">Pré-visualização na vitrine</div>
                    <PropertyCardPremium
                      property={{
                        id: 'preview-review',
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
                        description: description,
                        purpose: (purpose || 'SALE') as 'SALE' | 'RENT',
                      }}
                      watermark
                    />
                  </div>
                </div>
              </div>
            )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-8 bg-gradient-to-br from-blue-50 to-purple-50 ring-1 ring-black/5">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-purple-700 mb-2">Cadastrar Imóvel</h1>
          <p className="text-gray-700/90 mb-8">Preencha as informações do seu imóvel para publicá-lo na plataforma.</p>

          <form onSubmit={handleSubmit} onKeyDown={(e) => { if ((e as any).key === 'Enter' && currentStep < 4) { e.preventDefault(); } }} className="space-y-8">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Informações básicas</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Finalidade *</label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setPurpose('SALE')} className={`px-4 py-2 rounded-lg border ${purpose==='SALE' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>Venda</button>
                    <button type="button" onClick={() => setPurpose('RENT')} className={`px-4 py-2 rounded-lg border ${purpose==='RENT' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>Aluguel</button>
                  </div>
                  {purpose === '' && <p className="mt-1 text-xs text-red-600">Selecione a finalidade.</p>}
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
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'HOUSE', label: 'Casa', Icon: House },
                      { id: 'APARTMENT', label: 'Apartamento', Icon: Building2 },
                      { id: 'CONDO', label: 'Condomínio', Icon: Landmark },
                      { id: 'TOWNHOUSE', label: 'Sobrado', Icon: Home },
                      { id: 'STUDIO', label: 'Studio', Icon: Building },
                      { id: 'LAND', label: 'Terreno', Icon: Warehouse },
                      { id: 'COMMERCIAL', label: 'Comercial', Icon: Building },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setType(opt.id)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${type === opt.id ? 'border-transparent text-white bg-gradient-to-r from-blue-600 to-purple-600' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
                        aria-pressed={type === opt.id}
                      >
                        <opt.Icon className="w-4 h-4" /> {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição (opcional)
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    rows={4}
                    placeholder="Descreva o imóvel, suas características e o que o torna especial..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  {featureSuggestions.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Sugestões de características detectadas</span>
                        <span className="text-xs text-gray-500">Clique para aplicar (1)</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {featureSuggestions.map((sug) => {
                          const exists = conditionTags.includes(sug);
                          return (
                            <button
                              key={sug}
                              type="button"
                              onClick={() => { setConditionTags([sug]); }}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${exists ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-default' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                              aria-disabled={exists}
                            >
                              {sug}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Características/Diferenciais (1)</label>
                  <div className="flex flex-wrap gap-2">
                    {TAG_OPTIONS.map((tag) => {
                      const selected = conditionTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={
                            `px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ` +
                            (selected
                              ? "border-transparent text-white bg-gradient-to-r from-purple-600 to-blue-600"
                              : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50")
                          }
                          aria-pressed={selected}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                  {conditionTags.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">Selecionadas: {conditionTags.join(", ")}</p>
                  )}
                </div>
                {/* Campos opcionais financeiros */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Condomínio (R$) (opcional)</label>
                    <input className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" placeholder="350" value={condoFeeBRL} onChange={(e)=>setCondoFeeBRL(formatBRLInput(e.target.value))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">IPTU anual (R$) (opcional)</label>
                    <input className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" placeholder="900" value={iptuYearBRL} onChange={(e)=>setIptuYearBRL(formatBRLInput(e.target.value))} />
                  </div>
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

                {/* Mini mapa e coordenadas */
                }
                <div className="rounded-xl border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="inline-flex items-center gap-2 text-sm text-gray-700"><MapPinIcon className="w-4 h-4" /> Posição aproximada</div>
                    <span className="text-xs text-gray-500">Ajuste disponível após geolocalizar</span>
                  </div>
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-tr from-blue-50 to-purple-50 flex items-center justify-center text-xs text-gray-600">
                    {geo ? (
                      <div ref={mapContainerRef} className="w-full h-full" />
                    ) : (
                      <span>Valide o endereço para exibir o mapa</span>
                    )}
                  </div>
                  {geo && (
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <input className="px-3 py-2 border border-gray-300 rounded-lg" value={geo.lat} onChange={(e)=>setGeo({ lat: Number(e.target.value)||0, lng: geo.lng })} />
                      <input className="px-3 py-2 border border-gray-300 rounded-lg" value={geo.lng} onChange={(e)=>setGeo({ lat: geo.lat, lng: Number(e.target.value)||0 })} />
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Step 3: Details */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Detalhes do imóvel</h2>
                <div className="text-xs text-gray-500">Interno • Estrutura • Lazer • Condomínio</div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="relative">
                    <input
                      className="peer w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-transparent"
                      type="number"
                      placeholder=" "
                      value={bedrooms}
                      onChange={(e) => setBedrooms(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                    <label className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 bg-white px-1 text-sm text-gray-500 transition-all peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-not-placeholder-shown:top-0 peer-not-placeholder-shown:-translate-y-1/2 peer-not-placeholder-shown:text-xs">Quartos</label>
                  </div>
                  <div className="relative">
                    <input
                      className="peer w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-transparent"
                      type="number"
                      step="0.5"
                      placeholder=" "
                      value={bathrooms}
                      onChange={(e) => setBathrooms(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                    <label className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 bg-white px-1 text-sm text-gray-500 transition-all peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-not-placeholder-shown:top-0 peer-not-placeholder-shown:-translate-y-1/2 peer-not-placeholder-shown:text-xs">Banheiros</label>
                  </div>
                  <div className="relative">
                    <input
                      className="peer w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-transparent"
                      type="number"
                      placeholder=" "
                      value={areaM2}
                      onChange={(e) => setAreaM2(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                    <label className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 bg-white px-1 text-sm text-gray-500 transition-all peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-not-placeholder-shown:top-0 peer-not-placeholder-shown:-translate-y-1/2 peer-not-placeholder-shown:text-xs">Área (m²)</label>
                  </div>
                </div>

                {/* Interno / Estrutura */}
                {/* Campos principais (texto/números) */}
                <div className="pt-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="relative">
                    <input className="peer w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-transparent" type="number" placeholder=" " value={parkingSpots as any} onChange={(e)=>setParkingSpots(e.target.value === '' ? '' : Number(e.target.value))} />
                    <label className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 bg-white px-1 text-sm text-gray-500 transition-all peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-not-placeholder-shown:top-0 peer-not-placeholder-shown:-translate-y-1/2 peer-not-placeholder-shown:text-xs">Vagas</label>
                  </div>
                  <div className="relative">
                    <input className="peer w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-transparent" type="number" placeholder=" " value={suites as any} onChange={(e)=>setSuites(e.target.value === '' ? '' : Number(e.target.value))} />
                    <label className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 bg-white px-1 text-sm text-gray-500 transition-all peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-not-placeholder-shown:top-0 peer-not-placeholder-shown:-translate-y-1/2 peer-not-placeholder-shown:text-xs">Suítes</label>
                  </div>
                  <div className="relative">
                    <input className="peer w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-transparent" type="number" placeholder=" " value={floor as any} onChange={(e)=>setFloor(e.target.value === '' ? '' : Number(e.target.value))} />
                    <label className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 bg-white px-1 text-sm text-gray-500 transition-all peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-not-placeholder-shown:top-0 peer-not-placeholder-shown:-translate-y-1/2 peer-not-placeholder-shown:text-xs">Andar</label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="relative">
                    <input className="peer w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-transparent" type="number" placeholder=" " value={totalFloors as any} onChange={(e)=>setTotalFloors(e.target.value === '' ? '' : Number(e.target.value))} />
                    <label className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 bg-white px-1 text-sm text-gray-500 transition-all peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-not-placeholder-shown:top-0 peer-not-placeholder-shown:-translate-y-1/2 peer-not-placeholder-shown:text-xs">Total de andares</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Orientação solar (opcional)</label>
                    <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" value={sunOrientation} onChange={(e)=>setSunOrientation(e.target.value)}>
                      <option value="">Selecione</option>
                      <option value="Nascente">Nascente</option>
                      <option value="Poente">Poente</option>
                    </select>
                  </div>
                  <div className="relative">
                    <input className="peer w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-transparent" type="number" placeholder=" " value={yearBuilt as any} onChange={(e)=>setYearBuilt(e.target.value === '' ? '' : Number(e.target.value))} />
                    <label className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 bg-white px-1 text-sm text-gray-500 transition-all peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-not-placeholder-shown:top-0 peer-not-placeholder-shown:-translate-y-1/2 peer-not-placeholder-shown:text-xs">Ano de construção (opcional)</label>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="relative">
                    <input className="peer w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-transparent" type="number" placeholder=" " value={yearRenovated as any} onChange={(e)=>setYearRenovated(e.target.value === '' ? '' : Number(e.target.value))} />
                    <label className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 bg-white px-1 text-sm text-gray-500 transition-all peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-not-placeholder-shown:top-0 peer-not-placeholder-shown:-translate-y-1/2 peer-not-placeholder-shown:text-xs">Ano de reforma (opcional)</label>
                  </div>
                </div>

                {/* Recursos e facilidades (checkboxes) */}
                <div className="pt-2">
                  <div className="text-sm font-medium text-gray-800 mb-2">Recursos e facilidades</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <label className="inline-flex items-center gap-2"><input type="checkbox" className="rounded" checked={hasBalcony} onChange={(e)=>setHasBalcony(e.target.checked)} /> Varanda</label>
                    <label className="inline-flex items-center gap-2"><input type="checkbox" className="rounded" checked={hasElevator} onChange={(e)=>setHasElevator(e.target.checked)} /> Elevador</label>
                    <label className="inline-flex items-center gap-2"><input type="checkbox" className="rounded" checked={hasPool} onChange={(e)=>setHasPool(e.target.checked)} /> Piscina</label>
                    <label className="inline-flex items-center gap-2"><input type="checkbox" className="rounded" checked={hasGym} onChange={(e)=>setHasGym(e.target.checked)} /> Academia</label>
                    <label className="inline-flex items-center gap-2"><input type="checkbox" className="rounded" checked={hasPlayground} onChange={(e)=>setHasPlayground(e.target.checked)} /> Playground</label>
                    <label className="inline-flex items-center gap-2"><input type="checkbox" className="rounded" checked={hasPartyRoom} onChange={(e)=>setHasPartyRoom(e.target.checked)} /> Salão de festas</label>
                    <label className="inline-flex items-center gap-2"><input type="checkbox" className="rounded" checked={hasGourmet} onChange={(e)=>setHasGourmet(e.target.checked)} /> Espaço gourmet/Churrasqueira</label>
                    <label className="inline-flex items-center gap-2"><input type="checkbox" className="rounded" checked={hasConcierge24h} onChange={(e)=>setHasConcierge24h(e.target.checked)} /> Portaria 24h</label>
                  </div>
                </div>

                {/* Extras */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Orientação solar (opcional)</label>
                    <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" value={sunOrientation} onChange={(e)=>setSunOrientation(e.target.value)}>
                      <option value="">Selecione</option>
                      <option value="Nascente">Nascente</option>
                      <option value="Poente">Poente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ano de construção (opcional)</label>
                    <input className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" type="number" placeholder="2015" value={yearBuilt as any} onChange={(e)=>setYearBuilt(e.target.value === '' ? '' : Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ano de reforma (opcional)</label>
                    <input className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" type="number" placeholder="2022" value={yearRenovated as any} onChange={(e)=>setYearRenovated(e.target.value === '' ? '' : Number(e.target.value))} />
                  </div>
                </div>

                {/* Accordions */}
                <div className="space-y-3">
                  {/* Acessibilidade */}
                  <div className="border rounded-lg overflow-hidden">
                    <button type="button" onClick={()=>setOpenAcc(a=>({...a, acc:true, acc_acc:!a.acc_acc}))} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium">
                      <span>Acessibilidade</span>
                      <span>{openAcc.acc_acc ? '−' : '+'}</span>
                    </button>
                    {openAcc.acc_acc && (
                      <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={accRamps} onChange={(e)=>setAccRamps(e.target.checked)} /> Rampas</label>
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={accWideDoors} onChange={(e)=>setAccWideDoors(e.target.checked)} /> Portas largas</label>
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={accAccessibleElevator} onChange={(e)=>setAccAccessibleElevator(e.target.checked)} /> Elevador acessível</label>
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={accTactile} onChange={(e)=>setAccTactile(e.target.checked)} /> Sinalização tátil</label>
                      </div>
                    )}
                  </div>

                  {/* Conforto/Energia */}
                  <div className="border rounded-lg overflow-hidden">
                    <button type="button" onClick={()=>setOpenAcc(a=>({...a, acc_ce:!a.acc_ce}))} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium">
                      <span>Conforto/Energia</span>
                      <span>{openAcc.acc_ce ? '−' : '+'}</span>
                    </button>
                    {openAcc.acc_ce && (
                      <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={comfortAC} onChange={(e)=>setComfortAC(e.target.checked)} /> Ar-condicionado</label>
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={comfortHeating} onChange={(e)=>setComfortHeating(e.target.checked)} /> Aquecimento</label>
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={comfortSolar} onChange={(e)=>setComfortSolar(e.target.checked)} /> Aquecimento solar</label>
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={comfortNoiseWindows} onChange={(e)=>setComfortNoiseWindows(e.target.checked)} /> Janelas antirruído</label>
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={comfortLED} onChange={(e)=>setComfortLED(e.target.checked)} /> Iluminação LED</label>
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={comfortWaterReuse} onChange={(e)=>setComfortWaterReuse(e.target.checked)} /> Reuso de água</label>
                      </div>
                    )}
                  </div>

                  {/* Acabamentos */}
                  <div className="border rounded-lg overflow-hidden">
                    <button type="button" onClick={()=>setOpenAcc(a=>({...a, acc_fin:!a.acc_fin}))} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium">
                      <span>Acabamentos</span>
                      <span>{openAcc.acc_fin ? '−' : '+'}</span>
                    </button>
                    {openAcc.acc_fin && (
                      <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Piso</label>
                          <select className="w-full px-3 py-2 border rounded" value={finishFloor} onChange={(e)=>setFinishFloor(e.target.value)}>
                            <option value="">Selecione</option>
                            <option value="porcelanato">Porcelanato</option>
                            <option value="madeira">Madeira</option>
                            <option value="vinilico">Vinílico</option>
                          </select>
                        </div>
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={finishCabinets} onChange={(e)=>setFinishCabinets(e.target.checked)} /> Armários planejados</label>
                        <div className="flex flex-col gap-2">
                          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={finishCounterGranite} onChange={(e)=>setFinishCounterGranite(e.target.checked)} /> Bancadas em granito</label>
                          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={finishCounterQuartz} onChange={(e)=>setFinishCounterQuartz(e.target.checked)} /> Bancadas em quartzo</label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Vista/Posição */}
                  <div className="border rounded-lg overflow-hidden">
                    <button type="button" onClick={()=>setOpenAcc(a=>({...a, acc_view:!a.acc_view}))} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium">
                      <span>Vista/Posição</span>
                      <span>{openAcc.acc_view ? '−' : '+'}</span>
                    </button>
                    {openAcc.acc_view && (
                      <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={viewSea} onChange={(e)=>setViewSea(e.target.checked)} /> Vista mar</label>
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={viewCity} onChange={(e)=>setViewCity(e.target.checked)} /> Vista cidade</label>
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={positionFront} onChange={(e)=>setPositionFront(e.target.checked)} /> Frente</label>
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={positionBack} onChange={(e)=>setPositionBack(e.target.checked)} /> Fundos</label>
                        <input className="px-3 py-2 border rounded" placeholder="Posição do sol por cômodo (opcional)" value={sunByRoomNote} onChange={(e)=>setSunByRoomNote(e.target.value)} />
                      </div>
                    )}
                  </div>

                  {/* Pets/Políticas */}
                  <div className="border rounded-lg overflow-hidden">
                    <button type="button" onClick={()=>setOpenAcc(a=>({...a, acc_pets:!a.acc_pets}))} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium">
                      <span>Pets/Políticas</span>
                      <span>{openAcc.acc_pets ? '−' : '+'}</span>
                    </button>
                    {openAcc.acc_pets && (
                      <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={petsSmall} onChange={(e)=>setPetsSmall(e.target.checked)} /> Permite pets pequeno porte</label>
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={petsLarge} onChange={(e)=>setPetsLarge(e.target.checked)} /> Permite pets grande porte</label>
                        <textarea className="sm:col-span-2 px-3 py-2 border rounded" rows={2} placeholder="Regras do condomínio (opcional)" value={condoRules} onChange={(e)=>setCondoRules(e.target.value)} />
                      </div>
                    )}
                  </div>

                  {/* Segurança */}
                  <div className="border rounded-lg overflow-hidden">
                    <button type="button" onClick={()=>setOpenAcc(a=>({...a, acc_sec:!a.acc_sec}))} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium">
                      <span>Segurança</span>
                      <span>{openAcc.acc_sec ? '−' : '+'}</span>
                    </button>
                    {openAcc.acc_sec && (
                      <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={secCCTV} onChange={(e)=>setSecCCTV(e.target.checked)} /> CFTV</label>
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={secSallyPort} onChange={(e)=>setSecSallyPort(e.target.checked)} /> Clausura</label>
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={secNightGuard} onChange={(e)=>setSecNightGuard(e.target.checked)} /> Vigia noturno</label>
                        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={secElectricFence} onChange={(e)=>setSecElectricFence(e.target.checked)} /> Cerca elétrica</label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Images */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Fotos do imóvel</h2>
                {/* Dicas contextuais e watermark toggle */}
                <div className="rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-800">Dicas</div>
                    <label className="inline-flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" className="rounded" checked={showWatermark} onChange={(e)=>setShowWatermark(e.target.checked)} /> Watermark Zillowlike</label>
                  </div>
                  <ul className="mt-2 text-sm text-gray-700 space-y-1">
                    <li className="flex items-center gap-2"><Camera className="w-4 h-4 text-purple-600" /> Priorize ambientes principais: fachada, sala, cozinha.</li>
                    <li className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-purple-600" /> Prefira fotos horizontais e boa iluminação natural.</li>
                    <li className="flex items-center gap-2"><Camera className="w-4 h-4 text-purple-600" /> Arraste para ordenar: capa primeiro.</li>
                  </ul>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={suggestCover} className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">Sugerir capa</button>
                </div>
                
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
                       onClick={() => dropInputRef.current?.click()}
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
                    <input
                      ref={dropInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length) {
                          handleDroppedFiles(e.target.files);
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                  </div>
                  {/* Modern gallery */}
                  <h3 className="text-sm font-medium text-gray-700 mt-6 mb-2">Galeria</h3>
                  <p className="text-xs text-gray-500 mb-3">Arraste para reordenar. Clique para editar legenda. Cole imagens (Ctrl/Cmd+V) diretamente aqui.</p>
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
                    <SortableContext items={images.map((img, i) => img.url ? `thumb-${i}` : null).filter(Boolean) as string[]} strategy={rectSortingStrategy}>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {images.map((img, i) => (
                          img.url ? (
                            <SortableItem key={`thumb-${i}`} id={`thumb-${i}`}>
                              <div className="group relative overflow-hidden rounded-lg border bg-white">
                                <img
                                  src={img.url}
                                  alt={img.alt || `Imagem ${i + 1}`}
                                  className="w-full h-36 object-cover"
                                  draggable={false}
                                />
                                <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-white/90 text-gray-700 shadow">
                                  {i === 0 ? <span>Capa</span> : <span>#{i + 1}</span>}
                                </div>
                                {/* Status icon */}
                                <div className="absolute top-2 left-20">
                                  {img.error ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-red-600 text-white shadow">Erro</span>
                                  ) : img.pending ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-yellow-500 text-white shadow">Enviando</span>
                                  ) : img.progress === 100 ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-green-600 text-white shadow">OK</span>
                                  ) : null}
                                </div>
                                <div className="absolute top-2 right-2 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setImages((prev) => arrayMove(prev, i, 0)); }}
                                    className="p-2 rounded-md bg-white/90 hover:bg-white text-yellow-600 shadow"
                                    aria-label="Definir capa"
                                    title="Definir capa"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.787 1.401 8.168L12 18.896l-7.335 3.87 1.401-8.168L.132 9.211l8.2-1.193L12 .587z"/></svg>
                                  </button>
                                  {images.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); lastFocusRef.current = e.currentTarget as HTMLElement; setConfirmDelete({ open: true, index: i }); }}
                                      className="p-2 rounded-md bg-white/90 hover:bg-white text-red-600 shadow"
                                      aria-label="Remover imagem"
                                      title="Remover"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M9 3a1 1 0 0 0-1 1v1H5.5a1 1 0 1 0 0 2H6v11a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7h.5a1 1 0 1 0 0-2H16V4a1 1 0 0 0-1-1H9zm2 3V5h2v1h-2zM8 7h8v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V7z"/></svg>
                                    </button>
                                  )}
                                </div>
                                {/* Progress bar */}
                                {typeof img.progress === 'number' && !img.error && (
                                  <div className="absolute left-0 right-0 bottom-0 h-1 bg-gray-200">
                                    <div
                                      className={`${img.progress < 100 ? 'bg-yellow-500' : 'bg-green-600'} h-full transition-all`}
                                      style={{ width: `${Math.max(1, Math.min(100, img.progress))}%` }}
                                    />
                                  </div>
                                )}
                                {/* Caption overlay editable */}
                                <button
                                  type="button"
                                  onClick={() => setImages((prev) => prev.map((it, idx) => idx === i ? { ...it, editing: !(it as any).editing } as any : it))}
                                  className="absolute bottom-2 left-2 px-2 py-0.5 text-[11px] rounded bg-white/90 text-gray-700 shadow hover:bg-white"
                                >
                                  {(img as any).editing ? 'Fechar' : (img.alt ? 'Editar legenda' : 'Adicionar legenda')}
                                </button>
                                {(img as any).editing && (
                                  <div className="absolute inset-x-2 bottom-2 p-2 rounded-md bg-white/95 shadow flex items-center gap-2">
                                    <input
                                      value={img.alt || ''}
                                      onChange={(e) => setImages((prev) => prev.map((it, idx) => idx === i ? { ...it, alt: e.target.value } : it))}
                                      placeholder="Legenda curta"
                                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                                      maxLength={60}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setImages((prev) => prev.map((it, idx) => idx === i ? { ...it, editing: undefined } as any : it))}
                                      className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                                    >Salvar</button>
                                  </div>
                                )}
                              </div>
                            </SortableItem>
                          ) : null
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => dropInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
                  >
                    <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    <span className="text-gray-600">Adicionar mais fotos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => dropInputRef.current?.click()}
                    className="w-full border border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-all duration-200"
                    title="Abrirá o seletor de arquivos; use Ctrl/Cmd + A para selecionar todas"
                  >
                    <span className="text-gray-700">Selecionar todas</span>
                  </button>
                </div>
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
              
              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-colors duration-200 shadow"
                >
                  {isGeocoding && currentStep === 2 ? "Validando endereço..." : "Próximo"}
                </button>
              ) : (
                <button
                  type="submit"
                  onClick={() => setSubmitIntent(true)}
                  disabled={isSubmitting || images.some((i) => i.pending)}
                  title={images.some((i) => i.pending) ? "Aguarde terminar o envio das imagens" : undefined}
                  className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:from-emerald-400 disabled:to-green-400 text-white rounded-lg font-medium transition-all duration-200 shadow"
                >
                  {isSubmitting ? "Publicando..." : images.some((i) => i.pending) ? "Aguardando imagens..." : "Publicar Imóvel"}
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
                description: description,
                purpose: (purpose || 'SALE') as 'SALE' | 'RENT',
              }}
              watermark={showWatermark}
            />
            {/* Contextual tips panel (modern glass/gradient) */}
            <div className="mt-4">
              <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-blue-600/25 to-purple-600/25">
                <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-white/40 shadow-sm">
                  <div className="flex items-center justify-between px-4 pt-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600/10 to-purple-600/10 text-blue-700">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="M5.6 5.6l2.1 2.1"/><path d="M16.3 16.3l2.1 2.1"/><path d="M5.6 18.4l2.1-2.1"/><path d="M16.3 7.7l2.1-2.1"/></svg>
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Dicas do passo</h3>
                        <p className="text-[11px] text-gray-500 leading-4">Orientações rápidas para deixar seu anúncio melhor</p>
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-gray-600">
                      <span>Mostrar</span>
                      <input type="checkbox" className="sr-only peer" checked={showTips} onChange={(e)=>setShowTips(e.target.checked)} />
                      <span className="w-10 h-5 rounded-full bg-gray-300 peer-checked:bg-gradient-to-r peer-checked:from-blue-600 peer-checked:to-purple-600 relative transition-colors">
                        <span className="absolute top-1/2 -translate-y-1/2 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-all peer-checked:left-[1.375rem]"></span>
                      </span>
                    </label>
                  </div>
                  {showTips ? (
                    <ul className="px-4 pb-4 pt-3 text-[13px] text-gray-800 space-y-2">
                      {tipsForStep(currentStep).map((t, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-blue-600/15 to-purple-600/15 text-blue-700">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                          </span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 pb-4 pt-3">
                      <p className="text-[12px] text-gray-500">Dicas ocultas. Ative quando desejar.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
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
            <button onClick={closeLightbox} className="absolute top-3 right-3 p-2 rounded-md bg-white/80 hover:bg-white shadow" aria-label="Fechar">✕</button>
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
    </DashboardLayout>
  );
}