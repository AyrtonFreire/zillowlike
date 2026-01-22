"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Home, Building2, Landmark, Building, Warehouse, House, Camera, Image as ImageIcon, MapPin as MapPinIcon, MessageCircle, Phone, Mail, ChevronDown, ArrowLeft } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis, restrictToParentElement, restrictToWindowEdges } from "@dnd-kit/modifiers";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import PropertyCardPremium from "@/components/modern/PropertyCardPremium";
import { geocodeAddressParts } from "@/lib/geocode";
import { PropertyCreateSchema } from "@/lib/schemas";
import { buildPropertyPath } from "@/lib/slug";
import { parseVideoUrl } from "@/lib/video";
import Toast from "@/components/Toast";
import { useIssueDrawer } from "@/contexts/IssueDrawerContext";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import Textarea from "@/components/ui/Textarea";
import PhoneVerificationModal from "@/components/PhoneVerificationModal";

type ImageInput = { url: string; alt?: string; useUrl?: boolean; pending?: boolean; error?: string; editing?: boolean; progress?: number; reserved?: boolean; file?: File };

export default function NewPropertyPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success"|"error"|"info" } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitIntent, setSubmitIntent] = useState(false);
  const [publishedProperty, setPublishedProperty] = useState<{ id: string; title: string; url: string } | null>(null);

  const { showIssues } = useIssueDrawer();

  const stepperScrollRef = useRef<HTMLDivElement | null>(null);
  const stepperItemRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const formRef = useRef<HTMLFormElement | null>(null);
  
  const [description, setDescription] = useState("");
  const [aiDescriptionGenerations, setAiDescriptionGenerations] = useState<number>(0);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [aiGenerateWarning, setAiGenerateWarning] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState(""); // Título editável pelo usuário
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [priceBRL, setPriceBRL] = useState("");
  const [type, setType] = useState("HOUSE");
  const [purpose, setPurpose] = useState<"SALE"|"RENT"|"">("");
  const [conditionTags, setConditionTags] = useState<string[]>([]);
  const [petFriendly, setPetFriendly] = useState(false);
  const [featureSuggestions, setFeatureSuggestions] = useState<string[]>([]);
  const [condoFeeBRL, setCondoFeeBRL] = useState("");
  const [iptuYearBRL, setIptuYearBRL] = useState("");
  const [bedrooms, setBedrooms] = useState<string>("");
  const [bathrooms, setBathrooms] = useState<string>("");
  const [areaM2, setAreaM2] = useState<string>("");
  const [builtAreaM2, setBuiltAreaM2] = useState<string>("");
  const [lotAreaM2, setLotAreaM2] = useState<string>("");
  const [privateAreaM2, setPrivateAreaM2] = useState<string>("");
  const [usableAreaM2, setUsableAreaM2] = useState<string>("");
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

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const applyErrorsAndFocus = (step: number, errors: Record<string, string>) => {
    setFieldErrors(errors);
    setCurrentStep(step);
    const firstKey = Object.keys(errors)[0];
    if (!firstKey) return;
    window.setTimeout(() => {
      const el = document.getElementById(firstKey) as HTMLElement | null;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as any).focus?.();
    }, 50);
  };

  useEffect(() => {
    const el = stepperItemRefs.current[currentStep];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [currentStep]);
  const CONDITION_STATUS_OPTIONS: string[] = useMemo(
    () => ["Novo", "Reformado", "Em obras", "Em construção", "Na planta", "Pronto para morar"],
    []
  );
  const CONDITION_EXTRA_OPTIONS: string[] = useMemo(
    () => ["Mobiliado", "Semi-mobiliado"],
    []
  );
  const CONDITION_EXTRA_SET = useMemo(
    () => new Set(CONDITION_EXTRA_OPTIONS),
    [CONDITION_EXTRA_OPTIONS]
  );
  const CONDITION_STATUS_SET = useMemo(
    () => new Set(CONDITION_STATUS_OPTIONS),
    [CONDITION_STATUS_OPTIONS]
  );
  const FURNISHING_SET = useMemo(() => new Set(["Mobiliado", "Semi-mobiliado"]), []);
  const PROPERTY_FEATURE_TAG_OPTIONS: string[] = useMemo(
    () => [
      "Quintal",
      "Jardim",
      "Jardim de inverno",
      "Churrasqueira",
      "Área gourmet",
      "Varanda gourmet",
      "Área de serviço",
      "Lavanderia",
      "Lavabo",
      "Banheiro de serviço",
      "Despensa",
      "Depósito privativo",
      "Closet",
      "Home office",
      "Cozinha americana",
      "Cozinha planejada",
      "Dependência de empregada",
      "Piscina privativa",
      "Hidromassagem",
      "Sauna",
      "Lareira",
      "Pé-direito alto",
      "Mezanino",
      "Energia solar",
      "Gás encanado",
      "Aquecimento a gás",
      "Água individual",
      "Reúso de água",
      "Automação residencial",
    ],
    []
  );
  const PROPERTY_FEATURE_TAG_SET = useMemo(
    () => new Set(PROPERTY_FEATURE_TAG_OPTIONS),
    [PROPERTY_FEATURE_TAG_OPTIONS]
  );

  // Contadores para grupos de detalhes (usados nos headers dos accordions)
  const accAccessibilityCount = (accRamps ? 1 : 0) + (accWideDoors ? 1 : 0) + (accAccessibleElevator ? 1 : 0) + (accTactile ? 1 : 0);
  const accComfortCount = (comfortAC ? 1 : 0) + (comfortHeating ? 1 : 0) + (comfortSolar ? 1 : 0) + (comfortNoiseWindows ? 1 : 0) + (comfortLED ? 1 : 0) + (comfortWaterReuse ? 1 : 0);
  const accFinishCount = (finishFloor ? 1 : 0) + (finishCabinets ? 1 : 0) + (finishCounterGranite ? 1 : 0) + (finishCounterQuartz ? 1 : 0);
  const accViewCount = (viewSea ? 1 : 0) + (viewCity ? 1 : 0) + (positionFront ? 1 : 0) + (positionBack ? 1 : 0) + (sunByRoomNote ? 1 : 0);
  const accPetsCount = (petsSmall ? 1 : 0) + (petsLarge ? 1 : 0) + (condoRules ? 1 : 0);
  const accSecurityCount = (secCCTV ? 1 : 0) + (secSallyPort ? 1 : 0) + (secNightGuard ? 1 : 0) + (secElectricFence ? 1 : 0);
  const accMeasuresCount = [builtAreaM2, lotAreaM2, privateAreaM2, usableAreaM2].filter((v) => String(v || "").trim()).length;
  const accFeaturesCount = (hasBalcony ? 1 : 0) + (petFriendly ? 1 : 0) + conditionTags.filter((t) => PROPERTY_FEATURE_TAG_SET.has(t)).length;
  const accCondoCount =
    (hasElevator ? 1 : 0) +
    (hasPool ? 1 : 0) +
    (hasGym ? 1 : 0) +
    (hasGourmet ? 1 : 0) +
    (hasPlayground ? 1 : 0) +
    (hasPartyRoom ? 1 : 0) +
    (hasConcierge24h ? 1 : 0);
  const accConditionCount = conditionTags.filter((t) => CONDITION_STATUS_SET.has(t) || CONDITION_EXTRA_SET.has(t)).length;

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

    const measuresFilled = !!builtAreaM2 || !!lotAreaM2 || !!privateAreaM2 || !!usableAreaM2;
    if (measuresFilled) next.acc_measures = true;
    const featureTagsFilled = conditionTags.some((t) => PROPERTY_FEATURE_TAG_SET.has(t));
    const featuresFilled = hasBalcony || petFriendly || featureTagsFilled;
    if (featuresFilled) next.acc_features = true;
    const condoFilled = hasElevator || hasPool || hasGym || hasGourmet || hasPlayground || hasPartyRoom || hasConcierge24h;
    if (condoFilled) next.acc_condo = true;
    const conditionFilled = conditionTags.some((t) => CONDITION_STATUS_SET.has(t) || CONDITION_EXTRA_SET.has(t));
    if (conditionFilled) next.acc_condition = true;
    setOpenAcc(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accRamps, accWideDoors, accAccessibleElevator, accTactile, comfortAC, comfortHeating, comfortSolar, comfortNoiseWindows, comfortLED, comfortWaterReuse, finishFloor, finishCabinets, finishCounterGranite, finishCounterQuartz, viewSea, viewCity, positionFront, positionBack, sunByRoomNote, petsSmall, petsLarge, condoRules, secCCTV, secSallyPort, secNightGuard, secElectricFence, builtAreaM2, lotAreaM2, privateAreaM2, usableAreaM2, hasBalcony, petFriendly, conditionTags, hasElevator, hasPool, hasGym, hasGourmet, hasPlayground, hasPartyRoom, hasConcierge24h]);

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

  function toggleConditionTag(tag: string) {
    setConditionTags((prev) => {
      const has = prev.includes(tag);
      if (has) return prev.filter((t) => t !== tag);

      let next = [...prev];
      if (CONDITION_STATUS_SET.has(tag)) {
        next = next.filter((t) => !CONDITION_STATUS_SET.has(t));
      }
      if (FURNISHING_SET.has(tag)) {
        next = next.filter((t) => !FURNISHING_SET.has(t));
      }
      next.push(tag);
      return next;
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
  const [contactChannel, setContactChannel] = useState<"phone" | "email">("phone");
  const [profilePhone, setProfilePhone] = useState<string | null>(null);
  const [profilePhoneVerified, setProfilePhoneVerified] = useState<boolean>(false);
  const [phoneConfirmedForListing, setPhoneConfirmedForListing] = useState(false);
  const [showPhoneVerificationModal, setShowPhoneVerificationModal] = useState(false);
  const [phoneMode, setPhoneMode] = useState<"existing" | "new">("existing");
  const [newPhoneInput, setNewPhoneInput] = useState("");
  const [savingNewPhone, setSavingNewPhone] = useState(false);

  const [profileEmail, setProfileEmail] = useState<string | null>(null);
  const [profileEmailVerified, setProfileEmailVerified] = useState<boolean>(false);
  const [emailMode, setEmailMode] = useState<"existing" | "new">("existing");
  const [newEmailInput, setNewEmailInput] = useState("");
  const [savingNewEmail, setSavingNewEmail] = useState(false);
  const [emailConfirmedForListing, setEmailConfirmedForListing] = useState(false);
  
  // Dados privados do proprietário (não visíveis no anúncio)
  const [privateOwnerName, setPrivateOwnerName] = useState("");
  const [privateOwnerPhone, setPrivateOwnerPhone] = useState("");
  const [privateOwnerEmail, setPrivateOwnerEmail] = useState("");
  const [privateOwnerAddress, setPrivateOwnerAddress] = useState("");
  const [privateOwnerPriceBRL, setPrivateOwnerPriceBRL] = useState("");
  const [privateBrokerFeePercent, setPrivateBrokerFeePercent] = useState("");
  const [privateBrokerFeeFixedBRL, setPrivateBrokerFeeFixedBRL] = useState("");
  const [privateExclusive, setPrivateExclusive] = useState(false);
  const [privateExclusiveUntil, setPrivateExclusiveUntil] = useState("");
  const [privateOccupied, setPrivateOccupied] = useState(false);
  const [privateOccupantInfo, setPrivateOccupantInfo] = useState("");
  const [privateKeyLocation, setPrivateKeyLocation] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  
  // Configurações de visibilidade pública
  const [hidePrice, setHidePrice] = useState(false);
  const [hideExactAddress, setHideExactAddress] = useState(false);
  const [hideOwnerContact, setHideOwnerContact] = useState(false);
  const [hideCondoFee, setHideCondoFee] = useState(false);
  const [hideIPTU, setHideIPTU] = useState(false);
  
  // Leaflet
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMap = useRef<any>(null);
  const leafletMarker = useRef<any>(null);
  const leafletResizeHandler = useRef<(() => void) | null>(null);
  const leafletModuleRef = useRef<any>(null);
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
    if (!lightbox.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") nextLightbox();
      if (e.key === "ArrowLeft") prevLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox.open, images]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod: any = await import("leaflet");
        if (cancelled) return;
        leafletModuleRef.current = mod?.default ?? mod;
        setLeafletLoaded(true);
      } catch (e) {
        console.error("Failed to load Leaflet:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Carrega telefone do usuário para confirmação no fluxo de publicação
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.success || !data.user || cancelled) return;
        setProfilePhone(data.user.phone || "");
        setProfilePhoneVerified(!!data.user.phoneVerifiedAt);
        setProfileEmail(data.user.email || "");
        setProfileEmailVerified(!!data.user.emailVerified);
        setNewEmailInput(data.user.email || "");
      } catch {
        // Silencia falhas de rede; mantemos estado padrão
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasAnyVerifiedContact = useMemo(() => {
    return Boolean(profilePhoneVerified || profileEmailVerified);
  }, [profilePhoneVerified, profileEmailVerified]);

  const canPublish = useMemo(() => {
    return hasAnyVerifiedContact;
  }, [hasAnyVerifiedContact]);

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

  useEffect(() => {
    if (currentStep === 1) return;
    if (typeof window !== 'undefined' && leafletResizeHandler.current) {
      try { window.removeEventListener('resize', leafletResizeHandler.current); } catch {}
      leafletResizeHandler.current = null;
    }
    if (leafletMap.current) {
      try { leafletMap.current.remove(); } catch {}
      leafletMap.current = null;
    }
    leafletMarker.current = null;
  }, [currentStep]);

  // Initialize/Update Leaflet map when on Step 2 and geo available
  useEffect(() => {
    if (!leafletLoaded || currentStep !== 1) return;
    if (!mapContainerRef.current) return;
    const L = leafletModuleRef.current;
    if (!L) return;
    const container = mapContainerRef.current;
    const existingContainer = leafletMap.current?.getContainer?.() || leafletMap.current?._container;
    if (leafletMap.current && existingContainer && existingContainer !== container) {
      try { leafletMap.current.remove(); } catch {}
      leafletMap.current = null;
      leafletMarker.current = null;
    }
    // Create map once
    if (!leafletMap.current) {
      const center: [number, number] = geo ? [geo.lat, geo.lng] : [-9.3986, -40.5017]; // Petrolina as default
      leafletMap.current = L.map(container).setView(center, 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(leafletMap.current);
      // Ensure correct sizing after render
      setTimeout(() => { try { leafletMap.current.invalidateSize(); } catch {} }, 0);
      // Invalidate on resize
      const onResize = () => { try { leafletMap.current?.invalidateSize(); } catch {} };
      leafletResizeHandler.current = onResize;
      window.addEventListener('resize', onResize);
    }
    // Create/update marker when geo exists
    if (geo && leafletMap.current) {
      const addressPin = L.divIcon({
        html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;background:#0f766e;color:#fff;border-radius:9999px;box-shadow:0 10px 30px rgba(0,0,0,.22);border:2px solid #ffffff"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg></div>`,
        className: "",
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });
      const geoTuple = [geo.lat, geo.lng] as [number, number];
      if (!leafletMarker.current) {
        // Create marker
        try {
          leafletMarker.current = L.marker(geoTuple, { draggable: true, icon: addressPin }).addTo(leafletMap.current);
          leafletMarker.current.on('dragend', () => {
            const p = leafletMarker.current.getLatLng();
            setGeo({ lat: p.lat, lng: p.lng });
          });
        } catch (e) {
          console.error('Error creating marker:', e);
        }
      } else {
        // Update existing marker position
        try {
          leafletMarker.current.setLatLng(geoTuple);
        } catch (e) {
          console.error('Error updating marker:', e);
        }
      }
      // Center map
      try {
        leafletMap.current.setView(geoTuple);
      } catch (e) {
        console.error('Error centering map:', e);
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
    if (currentStep !== 1) return;
    const cepDigits = postalCode.replace(/\D+/g, "");
    if (cepDigits.length !== 8) return;
    if (!street || !city || !state) return;
    // geocode without number
    geocodeNow(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, cepValid, postalCode, street, city, state]);

  // When number is provided, place/update marker precisely on the address
  useEffect(() => {
    if (currentStep !== 1) return;
    if (!cepValid || !postalCode) return;
    if (!addressNumber || String(addressNumber).trim() === '') return;
    geocodeNow(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, cepValid, postalCode, addressNumber]);

  // Paste-from-clipboard support (Step 3)
  useEffect(() => {
    if (currentStep !== 3) return;
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

  async function preprocessImageForUpload(file: File): Promise<File> {
    const MAX_SIDE = 2560;
    const MIN_WIDTH = 800;
    const MAX_MB = 6;

    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = url;
      });

      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) return file;

      if (w < MIN_WIDTH) {
        setToast({ message: `Imagem pequena (${w}px). Vamos enviar mesmo assim.`, type: "info" });
        return file;
      }

      const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
      const targetW = Math.round(w * scale);
      const targetH = Math.round(h * scale);

      const shouldReencode = scale < 1 || file.type !== "image/webp" || file.size / (1024 * 1024) > MAX_MB;
      if (!shouldReencode) return file;

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const blob: Blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b as Blob), "image/webp", 0.82)
      );
      const processed = new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });

      const finalSizeMB = processed.size / (1024 * 1024);
      if (finalSizeMB > MAX_MB) {
        setToast({ message: `Imagem acima de ${MAX_MB}MB mesmo após otimização. Vamos enviar mesmo assim.`, type: "info" });
      }

      return processed;
    } catch {
      setToast({ message: "Não foi possível otimizar a imagem. Vamos enviar mesmo assim.", type: "info" });
      return file;
    } finally {
      URL.revokeObjectURL(url);
    }
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

      let processedFile: File;
      try {
        processedFile = await preprocessImageForUpload(file as File);
      } catch (err: any) {
        const localUrl = URL.createObjectURL(file as File);
        setToast({ message: err?.message || 'Imagem inválida', type: 'error' });
        setImages((prev) =>
          prev.map((it, i) =>
            i === targetIndex
              ? { ...it, url: localUrl, pending: false, error: err?.message || 'Imagem inválida', progress: undefined, reserved: false, file: undefined }
              : it
          )
        );
        continue;
      }

      const localUrl = URL.createObjectURL(processedFile as File);
      setImages((prev) => prev.map((it, i) => (i === targetIndex ? { ...it, url: localUrl, pending: true, error: undefined, progress: 1, reserved: true, file: processedFile as File } : it)));
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
        fd.append('file', processedFile as File);
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

  const SAVE_KEY = "owner_new_draft";

  // dnd-kit: sensors e item ordenável
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Helper: limpa todos os campos para um novo cadastro
  const resetForm = () => {
    setCurrentStep(1);
    setIsSubmitting(false);
    setToast(null);
    setSubmitIntent(false);
    setDescription("");
    setAiDescriptionGenerations(0);
    setIsGeneratingDescription(false);
    setCustomTitle("");
    setMetaTitle("");
    setMetaDescription("");
    setVideoUrl("");
    setPriceBRL("");
    setType("HOUSE");
    setConditionTags([]);
    setPetFriendly(false);
    setStreet("");
    setNeighborhood("");
    setCity("Petrolina");
    setState("PE");
    setPostalCode("");
    setAddressNumber("");
    setBedrooms("");
    setBathrooms("");
    setAreaM2("");
    setBuiltAreaM2("");
    setLotAreaM2("");
    setPrivateAreaM2("");
    setUsableAreaM2("");
    setSuites("");
    setParkingSpots("");
    setFloor("");
    setYearBuilt("");
    setYearRenovated("");
    setTotalFloors("");
    setCondoFeeBRL("");
    setIptuYearBRL("");
    setImages([{ url: "", useUrl: false }]);
    setGeo(null);
    setGeoPreview("");
    setCepValid(false);
    // Campos privados do proprietário
    setPrivateOwnerName("");
    setPrivateOwnerPhone("");
    setPrivateOwnerEmail("");
    setPrivateOwnerAddress("");
    setPrivateOwnerPriceBRL("");
    setPrivateBrokerFeePercent("");
    setPrivateBrokerFeeFixedBRL("");
    setPrivateExclusive(false);
    setPrivateExclusiveUntil("");
    setPrivateOccupied(false);
    setPrivateOccupantInfo("");
    setPrivateKeyLocation("");
    setPrivateNotes("");
    // Configurações de visibilidade
    setHidePrice(false);
    setHideExactAddress(false);
    setHideOwnerContact(false);
    setHideCondoFee(false);
    setHideIPTU(false);
  };

  const clearDraft = () => {
    if (typeof window !== "undefined") {
      try { window.localStorage.removeItem(SAVE_KEY); } catch {}
      try {
        fetch("/api/properties/draft", { method: "DELETE" }).catch(() => {});
      } catch {}
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
      userSelect: 'none',
      WebkitUserSelect: 'none',
      touchAction: 'none',
    };
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`${isDragging ? 'ring-2 ring-teal-500 shadow-lg scale-105' : ''} select-none`}
        {...attributes}
        {...listeners}
      >
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
      else if (d.aiGeneratedDescription) setDescription(d.aiGeneratedDescription);
      if (d.customTitle) setCustomTitle(d.customTitle);
      else if (d.aiGeneratedTitle) setCustomTitle(d.aiGeneratedTitle);
      if (d.metaTitle) setMetaTitle(d.metaTitle);
      else if (d.aiGeneratedMetaTitle) setMetaTitle(d.aiGeneratedMetaTitle);
      if (d.metaDescription) setMetaDescription(d.metaDescription);
      else if (d.aiGeneratedMetaDescription) setMetaDescription(d.aiGeneratedMetaDescription);
      if (d.videoUrl) setVideoUrl(d.videoUrl);
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
      if (typeof d.builtAreaM2 !== 'undefined') setBuiltAreaM2(d.builtAreaM2);
      if (typeof d.lotAreaM2 !== 'undefined') setLotAreaM2(d.lotAreaM2);
      if (typeof d.privateAreaM2 !== 'undefined') setPrivateAreaM2(d.privateAreaM2);
      if (typeof d.usableAreaM2 !== 'undefined') setUsableAreaM2(d.usableAreaM2);
      if (typeof d.suites !== 'undefined') setSuites(d.suites);
      if (typeof d.parkingSpots !== 'undefined') setParkingSpots(d.parkingSpots);
      if (typeof d.floor !== 'undefined') setFloor(d.floor);
      if (typeof d.yearBuilt !== 'undefined') setYearBuilt(d.yearBuilt);
      if (typeof d.yearRenovated !== 'undefined') setYearRenovated(d.yearRenovated);
      if (typeof d.totalFloors !== 'undefined') setTotalFloors(d.totalFloors);
      if (typeof d.aiDescriptionGenerations === 'number') setAiDescriptionGenerations(d.aiDescriptionGenerations);
      if (Array.isArray(d.images)) setImages(d.images);
      if (Array.isArray(d.conditionTags)) setConditionTags(d.conditionTags);
      if (typeof d.petFriendly === 'boolean') setPetFriendly(d.petFriendly);
      else if (Array.isArray(d.conditionTags) && d.conditionTags.includes('Aceita pets')) setPetFriendly(true);
      if (typeof d.currentStep === 'number' && d.currentStep >= 1 && d.currentStep <= 7) {
        setCurrentStep(d.currentStep);
      }
      // Campos privados do proprietário
      if (d.privateOwnerName) setPrivateOwnerName(d.privateOwnerName);
      if (d.privateOwnerPhone) setPrivateOwnerPhone(d.privateOwnerPhone);
      if (d.privateOwnerEmail) setPrivateOwnerEmail(d.privateOwnerEmail);
      if (d.privateOwnerAddress) setPrivateOwnerAddress(d.privateOwnerAddress);
      if (d.privateOwnerPriceBRL) setPrivateOwnerPriceBRL(d.privateOwnerPriceBRL);
      if (d.privateBrokerFeePercent) setPrivateBrokerFeePercent(d.privateBrokerFeePercent);
      if (d.privateBrokerFeeFixedBRL) setPrivateBrokerFeeFixedBRL(d.privateBrokerFeeFixedBRL);
      if (typeof d.privateExclusive === 'boolean') setPrivateExclusive(d.privateExclusive);
      if (d.privateExclusiveUntil) setPrivateExclusiveUntil(d.privateExclusiveUntil);
      if (typeof d.privateOccupied === 'boolean') setPrivateOccupied(d.privateOccupied);
      if (d.privateOccupantInfo) setPrivateOccupantInfo(d.privateOccupantInfo);
      if (d.privateKeyLocation) setPrivateKeyLocation(d.privateKeyLocation);
      if (d.privateNotes) setPrivateNotes(d.privateNotes);
      // Configurações de visibilidade
      if (typeof d.hidePrice === 'boolean') setHidePrice(d.hidePrice);
      if (typeof d.hideExactAddress === 'boolean') setHideExactAddress(d.hideExactAddress);
      if (typeof d.hideOwnerContact === 'boolean') setHideOwnerContact(d.hideOwnerContact);
      if (typeof d.hideCondoFee === 'boolean') setHideCondoFee(d.hideCondoFee);
      if (typeof d.hideIPTU === 'boolean') setHideIPTU(d.hideIPTU);
      if (typeof d.condoFeeBRL === 'string') setCondoFeeBRL(d.condoFeeBRL);
      if (d.iptuYearBRL) setIptuYearBRL(d.iptuYearBRL);
      else if (d.iptuYearlyBRL) setIptuYearBRL(d.iptuYearlyBRL);

      if (typeof d.hasBalcony === 'boolean') setHasBalcony(d.hasBalcony);
      if (typeof d.hasElevator === 'boolean') setHasElevator(d.hasElevator);
      if (typeof d.hasPool === 'boolean') setHasPool(d.hasPool);
      if (typeof d.hasGym === 'boolean') setHasGym(d.hasGym);
      if (typeof d.hasPlayground === 'boolean') setHasPlayground(d.hasPlayground);
      if (typeof d.hasPartyRoom === 'boolean') setHasPartyRoom(d.hasPartyRoom);
      if (typeof d.hasGourmet === 'boolean') setHasGourmet(d.hasGourmet);
      if (typeof d.hasConcierge24h === 'boolean') setHasConcierge24h(d.hasConcierge24h);

      if (typeof d.accRamps === 'boolean') setAccRamps(d.accRamps);
      if (typeof d.accWideDoors === 'boolean') setAccWideDoors(d.accWideDoors);
      if (typeof d.accAccessibleElevator === 'boolean') setAccAccessibleElevator(d.accAccessibleElevator);
      if (typeof d.accTactile === 'boolean') setAccTactile(d.accTactile);

      if (typeof d.comfortAC === 'boolean') setComfortAC(d.comfortAC);
      if (typeof d.comfortHeating === 'boolean') setComfortHeating(d.comfortHeating);
      if (typeof d.comfortSolar === 'boolean') setComfortSolar(d.comfortSolar);
      if (typeof d.comfortNoiseWindows === 'boolean') setComfortNoiseWindows(d.comfortNoiseWindows);
      if (typeof d.comfortLED === 'boolean') setComfortLED(d.comfortLED);
      if (typeof d.comfortWaterReuse === 'boolean') setComfortWaterReuse(d.comfortWaterReuse);

      if (typeof d.finishFloor === 'string') setFinishFloor(d.finishFloor);
      if (typeof d.finishCabinets === 'boolean') setFinishCabinets(d.finishCabinets);
      if (typeof d.finishCounterGranite === 'boolean') setFinishCounterGranite(d.finishCounterGranite);
      if (typeof d.finishCounterQuartz === 'boolean') setFinishCounterQuartz(d.finishCounterQuartz);

      if (typeof d.viewSea === 'boolean') setViewSea(d.viewSea);
      if (typeof d.viewCity === 'boolean') setViewCity(d.viewCity);
      if (typeof d.positionFront === 'boolean') setPositionFront(d.positionFront);
      if (typeof d.positionBack === 'boolean') setPositionBack(d.positionBack);
      if (typeof d.sunByRoomNote === 'string') setSunByRoomNote(d.sunByRoomNote);
      if (typeof d.sunOrientation === 'string') setSunOrientation(d.sunOrientation);

      if (typeof d.petsSmall === 'boolean') setPetsSmall(d.petsSmall);
      if (typeof d.petsLarge === 'boolean') setPetsLarge(d.petsLarge);
      if (typeof d.condoRules === 'string') setCondoRules(d.condoRules);

      if (typeof d.secCCTV === 'boolean') setSecCCTV(d.secCCTV);
      if (typeof d.secSallyPort === 'boolean') setSecSallyPort(d.secSallyPort);
      if (typeof d.secNightGuard === 'boolean') setSecNightGuard(d.secNightGuard);
      if (typeof d.secElectricFence === 'boolean') setSecElectricFence(d.secElectricFence);

      if (d.cloneFromPropertyId) {
        setToast({ message: "Anúncio clonado. Revise os campos antes de publicar.", type: "info" });
        try {
          const next = { ...d };
          delete (next as any).cloneFromPropertyId;
          window.localStorage.setItem(SAVE_KEY, JSON.stringify(next));
        } catch {}
      }
    } catch {}
  }, []);

  // Load draft from backend (por usuário autenticado)
  useEffect(() => {
    let cancelled = false;
    const loadFromApi = async () => {
      if (typeof window === "undefined") return;
      try {
        const res = await fetch("/api/properties/draft");
        if (!res.ok) return;
        const json = await res.json();
        const draft = json?.draft as any;
        if (!draft || cancelled) return;
        const d = (draft.data || {}) as any;

        if (d.description) setDescription(d.description);
        else if (d.aiGeneratedDescription) setDescription(d.aiGeneratedDescription);
        if (d.customTitle) setCustomTitle(d.customTitle);
        else if (d.aiGeneratedTitle) setCustomTitle(d.aiGeneratedTitle);
        if (d.metaTitle) setMetaTitle(d.metaTitle);
        else if (d.aiGeneratedMetaTitle) setMetaTitle(d.aiGeneratedMetaTitle);
        if (d.metaDescription) setMetaDescription(d.metaDescription);
        else if (d.aiGeneratedMetaDescription) setMetaDescription(d.aiGeneratedMetaDescription);
        if (d.videoUrl) setVideoUrl(d.videoUrl);
        if (d.priceBRL) setPriceBRL(d.priceBRL);
        if (d.type) setType(d.type);
        if (d.purpose) setPurpose(d.purpose);
        if (d.street) setStreet(d.street);
        if (d.neighborhood) setNeighborhood(d.neighborhood);
        if (d.city) setCity(d.city);
        if (d.state) setState(d.state);
        if (d.postalCode) setPostalCode(d.postalCode);
        if (typeof d.bedrooms !== "undefined") setBedrooms(d.bedrooms);
        if (typeof d.bathrooms !== "undefined") setBathrooms(d.bathrooms);
        if (typeof d.areaM2 !== "undefined") setAreaM2(d.areaM2);
        if (typeof d.builtAreaM2 !== 'undefined') setBuiltAreaM2(d.builtAreaM2);
        if (typeof d.lotAreaM2 !== 'undefined') setLotAreaM2(d.lotAreaM2);
        if (typeof d.privateAreaM2 !== 'undefined') setPrivateAreaM2(d.privateAreaM2);
        if (typeof d.usableAreaM2 !== 'undefined') setUsableAreaM2(d.usableAreaM2);
        if (typeof d.suites !== 'undefined') setSuites(d.suites);
        if (typeof d.parkingSpots !== 'undefined') setParkingSpots(d.parkingSpots);
        if (typeof d.floor !== 'undefined') setFloor(d.floor);
        if (typeof d.yearBuilt !== 'undefined') setYearBuilt(d.yearBuilt);
        if (typeof d.yearRenovated !== 'undefined') setYearRenovated(d.yearRenovated);
        if (typeof d.totalFloors !== 'undefined') setTotalFloors(d.totalFloors);
        if (typeof d.aiDescriptionGenerations === 'number') setAiDescriptionGenerations(d.aiDescriptionGenerations);
        if (Array.isArray(d.images)) setImages(d.images);
        if (Array.isArray(d.conditionTags)) setConditionTags(d.conditionTags);
        if (typeof d.petFriendly === 'boolean') setPetFriendly(d.petFriendly);
        else if (Array.isArray(d.conditionTags) && d.conditionTags.includes('Aceita pets')) setPetFriendly(true);

        const stepFromApi = typeof draft.currentStep === "number" ? draft.currentStep : d.currentStep;
        if (typeof stepFromApi === "number" && stepFromApi >= 1 && stepFromApi <= 7) {
          setCurrentStep(stepFromApi);
        }

        // Campos privados do proprietário
        if (d.privateOwnerName) setPrivateOwnerName(d.privateOwnerName);
        if (d.privateOwnerPhone) setPrivateOwnerPhone(d.privateOwnerPhone);
        if (d.privateOwnerEmail) setPrivateOwnerEmail(d.privateOwnerEmail);
        if (d.privateOwnerAddress) setPrivateOwnerAddress(d.privateOwnerAddress);
        if (d.privateOwnerPriceBRL) setPrivateOwnerPriceBRL(d.privateOwnerPriceBRL);
        if (d.privateBrokerFeePercent) setPrivateBrokerFeePercent(d.privateBrokerFeePercent);
        if (d.privateBrokerFeeFixedBRL) setPrivateBrokerFeeFixedBRL(d.privateBrokerFeeFixedBRL);
        if (typeof d.privateExclusive === 'boolean') setPrivateExclusive(d.privateExclusive);
        if (d.privateExclusiveUntil) setPrivateExclusiveUntil(d.privateExclusiveUntil);
        if (typeof d.privateOccupied === 'boolean') setPrivateOccupied(d.privateOccupied);
        if (d.privateOccupantInfo) setPrivateOccupantInfo(d.privateOccupantInfo);
        if (d.privateKeyLocation) setPrivateKeyLocation(d.privateKeyLocation);
        if (d.privateNotes) setPrivateNotes(d.privateNotes);
        // Configurações de visibilidade
        if (typeof d.hidePrice === 'boolean') setHidePrice(d.hidePrice);
        if (typeof d.hideExactAddress === 'boolean') setHideExactAddress(d.hideExactAddress);
        if (typeof d.hideOwnerContact === 'boolean') setHideOwnerContact(d.hideOwnerContact);
        if (typeof d.hideCondoFee === 'boolean') setHideCondoFee(d.hideCondoFee);
        if (typeof d.hideIPTU === 'boolean') setHideIPTU(d.hideIPTU);
        if (typeof d.condoFeeBRL === 'string') setCondoFeeBRL(d.condoFeeBRL);
        if (d.iptuYearBRL) setIptuYearBRL(d.iptuYearBRL);
        else if (d.iptuYearlyBRL) setIptuYearBRL(d.iptuYearlyBRL);

        if (typeof d.hasBalcony === 'boolean') setHasBalcony(d.hasBalcony);
        if (typeof d.hasElevator === 'boolean') setHasElevator(d.hasElevator);
        if (typeof d.hasPool === 'boolean') setHasPool(d.hasPool);
        if (typeof d.hasGym === 'boolean') setHasGym(d.hasGym);
        if (typeof d.hasPlayground === 'boolean') setHasPlayground(d.hasPlayground);
        if (typeof d.hasPartyRoom === 'boolean') setHasPartyRoom(d.hasPartyRoom);
        if (typeof d.hasGourmet === 'boolean') setHasGourmet(d.hasGourmet);
        if (typeof d.hasConcierge24h === 'boolean') setHasConcierge24h(d.hasConcierge24h);

        if (typeof d.accRamps === 'boolean') setAccRamps(d.accRamps);
        if (typeof d.accWideDoors === 'boolean') setAccWideDoors(d.accWideDoors);
        if (typeof d.accAccessibleElevator === 'boolean') setAccAccessibleElevator(d.accAccessibleElevator);
        if (typeof d.accTactile === 'boolean') setAccTactile(d.accTactile);

        if (typeof d.comfortAC === 'boolean') setComfortAC(d.comfortAC);
        if (typeof d.comfortHeating === 'boolean') setComfortHeating(d.comfortHeating);
        if (typeof d.comfortSolar === 'boolean') setComfortSolar(d.comfortSolar);
        if (typeof d.comfortNoiseWindows === 'boolean') setComfortNoiseWindows(d.comfortNoiseWindows);
        if (typeof d.comfortLED === 'boolean') setComfortLED(d.comfortLED);
        if (typeof d.comfortWaterReuse === 'boolean') setComfortWaterReuse(d.comfortWaterReuse);

        if (typeof d.finishFloor === 'string') setFinishFloor(d.finishFloor);
        if (typeof d.finishCabinets === 'boolean') setFinishCabinets(d.finishCabinets);
        if (typeof d.finishCounterGranite === 'boolean') setFinishCounterGranite(d.finishCounterGranite);
        if (typeof d.finishCounterQuartz === 'boolean') setFinishCounterQuartz(d.finishCounterQuartz);

        if (typeof d.viewSea === 'boolean') setViewSea(d.viewSea);
        if (typeof d.viewCity === 'boolean') setViewCity(d.viewCity);
        if (typeof d.positionFront === 'boolean') setPositionFront(d.positionFront);
        if (typeof d.positionBack === 'boolean') setPositionBack(d.positionBack);
        if (typeof d.sunByRoomNote === 'string') setSunByRoomNote(d.sunByRoomNote);
        if (typeof d.sunOrientation === 'string') setSunOrientation(d.sunOrientation);

        if (typeof d.petsSmall === 'boolean') setPetsSmall(d.petsSmall);
        if (typeof d.petsLarge === 'boolean') setPetsLarge(d.petsLarge);
        if (typeof d.condoRules === 'string') setCondoRules(d.condoRules);

        if (typeof d.secCCTV === 'boolean') setSecCCTV(d.secCCTV);
        if (typeof d.secSallyPort === 'boolean') setSecSallyPort(d.secSallyPort);
        if (typeof d.secNightGuard === 'boolean') setSecNightGuard(d.secNightGuard);
        if (typeof d.secElectricFence === 'boolean') setSecElectricFence(d.secElectricFence);

        try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(d)); } catch {}
      } catch {}
    };
    loadFromApi();
    return () => { cancelled = true; };
  }, []);

  // Autosave draft (debounced)
  useEffect(() => {
    // Não salva rascunho enquanto está publicando ou exibindo tela de sucesso
    if (isSubmitting || publishedProperty) return;
    const id = setTimeout(() => {
      try {
        const payload = {
          description,
          aiDescriptionGenerations,
          customTitle,
          metaTitle,
          metaDescription,
          videoUrl,
          priceBRL,
          type,
          purpose,
          street,
          neighborhood,
          city,
          state,
          postalCode,
          bedrooms,
          bathrooms,
          areaM2,
          builtAreaM2,
          lotAreaM2,
          privateAreaM2,
          usableAreaM2,
          suites,
          parkingSpots,
          floor,
          yearBuilt,
          yearRenovated,
          totalFloors,
          images,
          addressNumber,
          conditionTags,
          petFriendly,
          currentStep,
          iptuYearBRL,
          condoFeeBRL,
          // Dados privados do proprietário
          privateOwnerName,
          privateOwnerPhone,
          privateOwnerEmail,
          privateOwnerAddress,
          privateOwnerPriceBRL,
          privateBrokerFeePercent,
          privateBrokerFeeFixedBRL,
          privateExclusive,
          privateExclusiveUntil,
          privateOccupied,
          privateOccupantInfo,
          privateKeyLocation,
          privateNotes,
          // Configurações de visibilidade
          hidePrice,
          hideExactAddress,
          hideOwnerContact,
          hideCondoFee,
          hideIPTU,
          hasBalcony,
          hasElevator,
          hasPool,
          hasGym,
          hasPlayground,
          hasPartyRoom,
          hasGourmet,
          hasConcierge24h,
          accRamps,
          accWideDoors,
          accAccessibleElevator,
          accTactile,
          comfortAC,
          comfortHeating,
          comfortSolar,
          comfortNoiseWindows,
          comfortLED,
          comfortWaterReuse,
          finishFloor,
          finishCabinets,
          finishCounterGranite,
          finishCounterQuartz,
          viewSea,
          viewCity,
          positionFront,
          positionBack,
          sunByRoomNote,
          sunOrientation,
          petsSmall,
          petsLarge,
          condoRules,
          secCCTV,
          secSallyPort,
          secNightGuard,
          secElectricFence,
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(payload));

        // Sincroniza rascunho com o backend por usuário
        fetch("/api/properties/draft", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: payload, currentStep }),
        }).catch(() => {});
      } catch {}
    }, 400);
    return () => clearTimeout(id);
  }, [description, aiDescriptionGenerations, customTitle, metaTitle, metaDescription, videoUrl, priceBRL, type, purpose, street, neighborhood, city, state, postalCode, bedrooms, bathrooms, areaM2, builtAreaM2, lotAreaM2, privateAreaM2, usableAreaM2, suites, parkingSpots, floor, yearBuilt, yearRenovated, totalFloors, images, conditionTags, petFriendly, currentStep, iptuYearBRL, condoFeeBRL, privateOwnerName, privateOwnerPhone, privateOwnerEmail, privateOwnerAddress, privateOwnerPriceBRL, privateBrokerFeePercent, privateBrokerFeeFixedBRL, privateExclusive, privateExclusiveUntil, privateOccupied, privateOccupantInfo, privateKeyLocation, privateNotes, hidePrice, hideExactAddress, hideCondoFee, hideIPTU, hasBalcony, hasElevator, hasPool, hasGym, hasPlayground, hasPartyRoom, hasGourmet, hasConcierge24h, accRamps, accWideDoors, accAccessibleElevator, accTactile, comfortAC, comfortHeating, comfortSolar, comfortNoiseWindows, comfortLED, comfortWaterReuse, finishFloor, finishCabinets, finishCounterGranite, finishCounterQuartz, viewSea, viewCity, positionFront, positionBack, sunByRoomNote, sunOrientation, petsSmall, petsLarge, condoRules, secCCTV, secSallyPort, secNightGuard, secElectricFence, isSubmitting, publishedProperty]);

  // CEP: validação em tempo real com debounce quando atingir 8 dígitos
  useEffect(() => {
    const cepDigits = postalCode.replace(/\D+/g, "");
    if (cepDigits.length !== 8) {
      // Ainda não completou os 8 dígitos: não considera válido
      setCepValid(false);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cep/${cepDigits}`, { cache: 'no-store' });
        const data = await res.json();
        if (data?.erro) {
          setFieldErrors((prev) => ({ ...prev, postalCode: "CEP não encontrado." }));
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
        // Se a consulta externa falhar (offline, tempo excedido, etc.),
        // não vamos travar o fluxo: o usuário pode preencher endereço manualmente.
        setFieldErrors((prev) => ({
          ...prev,
          postalCode:
            "Não foi possível consultar o CEP agora. Preencha o endereço manualmente e tente novamente depois.",
        }));
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

  const clearLocationFields = () => {
    setPostalCode("");
    setStreet("");
    setAddressNumber("");
    setNeighborhood("");
    setCity("");
    setState("");
    setGeo(null);
    setGeoPreview("");
    setCepValid(false);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.postalCode;
      delete next.street;
      delete next.neighborhood;
      delete next.city;
      delete next.state;
      delete next.geo;
      return next;
    });
    if (leafletMarker.current && leafletMap.current) {
      try { leafletMap.current.removeLayer(leafletMarker.current); } catch {}
      leafletMarker.current = null;
    }
    if (leafletMap.current) {
      try { leafletMap.current.setView([-9.3986, -40.5017], 14); } catch {}
    }
  };

  const finalTitle = customTitle.trim();

  // Score de qualidade do anúncio
  const adQualityScore = useMemo(() => {
    let score = 0;
    const maxScore = 100;
    const items: { label: string; done: boolean; points: number }[] = [];
    
    // Campos obrigatórios (50 pontos)
    const hasPurpose = !!purpose;
    items.push({ label: 'Finalidade (Venda/Aluguel)', done: hasPurpose, points: 10 });
    score += hasPurpose ? 10 : 0;
    
    const hasPrice = parseBRLToNumber(priceBRL) > 0;
    items.push({ label: 'Preço definido', done: hasPrice, points: 10 });
    score += hasPrice ? 10 : 0;
    
    const hasType = !!type;
    items.push({ label: 'Tipo de imóvel', done: hasType, points: 5 });
    score += hasType ? 5 : 0;
    
    const hasAddress = !!geo;
    items.push({ label: 'Endereço validado', done: hasAddress, points: 15 });
    score += hasAddress ? 15 : 0;
    
    const imageCount = images.filter(i => i.url && !i.pending).length;
    const hasMinImages = imageCount >= 1;
    items.push({ label: 'Pelo menos 1 foto', done: hasMinImages, points: 10 });
    score += hasMinImages ? 10 : 0;
    
    // Campos recomendados (30 pontos)
    const hasDescription = description.length >= 50;
    items.push({ label: 'Descrição detalhada (50+ chars)', done: hasDescription, points: 10 });
    score += hasDescription ? 10 : 0;
    
    const hasDetails = bedrooms !== '' || bathrooms !== '' || areaM2 !== '';
    items.push({ label: 'Detalhes (quartos/área)', done: hasDetails, points: 10 });
    score += hasDetails ? 10 : 0;
    
    const hasGoodImages = imageCount >= 5;
    items.push({ label: '5+ fotos (recomendado)', done: hasGoodImages, points: 10 });
    score += hasGoodImages ? 10 : 0;
    
    // Diferenciais (20 pontos)
    const hasAmenities = hasBalcony || hasPool || hasGym || hasElevator || hasConcierge24h;
    items.push({ label: 'Diferenciais do imóvel', done: hasAmenities, points: 10 });
    score += hasAmenities ? 10 : 0;
    
    const hasExcellentImages = imageCount >= 10;
    items.push({ label: '10+ fotos (destaque)', done: hasExcellentImages, points: 10 });
    score += hasExcellentImages ? 10 : 0;
    
    // Classificação
    let level: 'low' | 'medium' | 'good' | 'excellent' = 'low';
    if (score >= 80) level = 'excellent';
    else if (score >= 60) level = 'good';
    else if (score >= 40) level = 'medium';
    
    return { score, maxScore, level, items, imageCount };
  }, [purpose, priceBRL, type, geo, images, description, bedrooms, bathrooms, areaM2, hasBalcony, hasPool, hasGym, hasElevator, hasConcierge24h]);

  const steps = [
    { id: 1, name: "Informações básicas", description: "Preço, tipo e endereço" },
    { id: 2, name: "Detalhes", description: "Quartos, banheiros e área" },
    { id: 3, name: "Fotos", description: "Imagens do imóvel" },
    { id: 4, name: "Descrição", description: "Título, texto e SEO" },
    { id: 5, name: "Dados do proprietário", description: "Informações internas (opcional)" },
    { id: 6, name: "Revisão final", description: "Conferir dados e publicar" },
  ];

  const publishFieldMeta = useMemo(() => {
    return {
      publish: { title: "Publicação", step: 6 },
      purpose: { title: "Finalidade", step: 1 },
      priceBRL: { title: "Preço", step: 1 },
      type: { title: "Tipo de imóvel", step: 1 },
      postalCode: { title: "CEP", step: 1 },
      street: { title: "Rua", step: 1 },
      addressNumber: { title: "Número", step: 1 },
      neighborhood: { title: "Bairro", step: 1 },
      city: { title: "Cidade", step: 1 },
      state: { title: "Estado (UF)", step: 1 },
      geo: { title: "Endereço no mapa", step: 1 },
      bedrooms: { title: "Quartos", step: 2 },
      bathrooms: { title: "Banheiros", step: 2 },
      areaM2: { title: "Área", step: 2 },
      builtAreaM2: { title: "Área construída", step: 2 },
      lotAreaM2: { title: "Área do terreno", step: 2 },
      privateAreaM2: { title: "Área privativa", step: 2 },
      usableAreaM2: { title: "Área útil", step: 2 },
      suites: { title: "Suítes", step: 2 },
      parkingSpots: { title: "Vagas", step: 2 },
      floor: { title: "Andar", step: 2 },
      totalFloors: { title: "Total de andares", step: 2 },
      yearBuilt: { title: "Ano de construção", step: 2 },
      yearRenovated: { title: "Ano de reforma", step: 2 },
      iptuYearBRL: { title: "IPTU", step: 6 },
      images: { title: "Fotos", step: 3 },
      title: { title: "Título do anúncio", step: 4 },
      metaTitle: { title: "Meta Title", step: 4 },
      metaDescription: { title: "Meta Description", step: 4 },
      videoUrl: { title: "Vídeo", step: 4 },
      contactVerification: { title: "Contato para publicação", step: 6 },
    } as const;
  }, []);

  const scrollToFieldId = (fieldId: string) => {
    if (typeof window === "undefined") return;
    window.setTimeout(() => {
      const el = document.getElementById(fieldId) as HTMLElement | null;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as any).focus?.();
    }, 80);
  };

  const openPublishIssues = (
    errors: Record<string, string>,
    options?: {
      title?: string;
      message?: string;
      technical?: { requestId?: string; status?: number };
    }
  ) => {
    const entries = Object.entries(errors).filter(([, msg]) => typeof msg === "string" && msg.trim());
    if (entries.length === 0) return;

    setFieldErrors(errors);

    const issues = entries
      .map(([fieldId, msg], i) => {
        const meta = (publishFieldMeta as any)[fieldId] as { title: string; step: number } | undefined;
        const step = meta?.step;
        const stepName = typeof step === "number" ? steps.find((s) => s.id === step)?.name : undefined;
        return {
          id: `${fieldId}-${i}`,
          title: meta?.title || fieldId,
          message: msg,
          severity: "error" as const,
          step,
          context: stepName ? `Etapa ${step}: ${stepName}` : undefined,
          fieldId,
          actionLabel: "Ir para corrigir",
        };
      })
      .sort((a, b) => {
        const as = typeof a.step === "number" ? a.step : 999;
        const bs = typeof b.step === "number" ? b.step : 999;
        if (as !== bs) return as - bs;
        return a.title.localeCompare(b.title);
      });

    showIssues(
      {
        title: options?.title || "Corrija antes de publicar",
        message: options?.message || "Corrija os itens abaixo para publicar o anúncio.",
        issues,
        technical: options?.technical,
        autoNavigateToFirst: true,
      },
      (issue) => {
        if (typeof issue.step === "number") setCurrentStep(issue.step);
        if (issue.fieldId) scrollToFieldId(issue.fieldId);
      }
    );
  };

  function tipsForStep(step: number): string[] {
    switch (step) {
      case 1:
        return [
          "Defina Venda ou Aluguel primeiro para orientar os campos.",
          "Preço sem centavos: use pontos para milhares (ex.: 450.000).",
          "Escolha o tipo certo (Casa, Apto, etc.) para filtros funcionarem bem.",
          "Preencha o endereço com cuidado para melhorar a busca e o mapa.",
        ];
      case 2:
        return [
          "Informe quartos/banheiros/área quando souber: ajuda o interessado a decidir.",
          "Tags como 'Reformado', 'Vaga coberta' e 'Varanda' aumentam relevância.",
          "Evite números exagerados; transparência gera melhores contatos.",
        ];
      case 3:
        return [
          "Adicione ao menos 1 foto; 8–15 fotos boas geram mais interesse.",
          "Prefira luz natural; mantenha os ambientes organizados.",
          "Arraste para ordenar; dá destaque às melhores fotos primeiro.",
        ];
      case 4:
        return [
          "Clique em 'Preencher Campos com IA' para gerar título, descrição e metas com base nos dados e fotos.",
          "Depois você pode editar todos os campos manualmente.",
          "Uma boa descrição aumenta a conversão e melhora a qualidade do anúncio.",
        ];
      case 5:
        return [
          "Esses dados são apenas para seu controle e não aparecem no anúncio.",
          "Use para registrar informações do proprietário, comissão e chave.",
          "Você pode preencher depois; essa etapa é opcional.",
        ];
      case 6:
        return [
          "Revise os dados com calma antes de publicar o anúncio.",
          "Use os botões 'Editar' para voltar rapidamente a qualquer etapa.",
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

    setFieldErrors({});

    if (finalTitle.length < 3) {
      openPublishIssues({ title: "Informe um título para o anúncio." });
      return;
    }

    if (!hasAnyVerifiedContact) {
      openPublishIssues({
        contactVerification: "Para publicar, verifique seu telefone ou e-mail em Meu Perfil.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Impede publicar enquanto houver uploads pendentes
      if (images.some((img) => img.pending)) {
        openPublishIssues({ images: "Aguarde terminar o envio das imagens antes de publicar." });
        return;
      }
      // Exige ao menos uma imagem válida
      const hasAtLeastOneImage = images.some((img) => img.url && img.url.trim().length > 0);
      if (!hasAtLeastOneImage) {
        openPublishIssues({ images: "Adicione pelo menos uma foto do imóvel." });
        return;
      }

      // Validar finalidade
      if (!purpose) {
        openPublishIssues({ purpose: "Selecione se é Venda ou Aluguel." });
        return;
      }

      const amenityTags = [
        hasBalcony && 'Varanda',
        hasElevator && 'Elevador',
        hasPool && 'Piscina',
        hasGym && 'Academia',
        hasPlayground && 'Playground',
        hasPartyRoom && 'Salão de festas',
        hasGourmet && 'Espaço gourmet',
        hasConcierge24h && 'Portaria 24h',
      ].filter(Boolean) as string[];
      const filteredConditionTags = (conditionTags || []).filter((t) => t !== 'Condomínio' && t !== 'Aceita permuta' && t !== 'Aceita pets');
      const mergedTags = Array.from(new Set([...(filteredConditionTags || []), ...amenityTags]));

      // Deriva flags usadas nos filtros de busca
      const isFurnished = mergedTags.includes('Mobiliado');
      const isPetFriendly = petFriendly || petsSmall || petsLarge;

      const payload = {
        title: finalTitle,
        metaTitle: metaTitle || "",
        metaDescription: metaDescription || "",
        description,
        videoUrl: videoUrl || "",
        priceBRL: parseBRLToNumber(priceBRL),
        type,
        purpose,
        address: { street, neighborhood, city, state, postalCode, number: addressNumber || undefined },
        geo: geo ? { lat: geo.lat, lng: geo.lng } : undefined,
        furnished: isFurnished,
        petFriendly: isPetFriendly,
        details: {
          bedrooms: bedrooms === "" ? null : Number(bedrooms),
          bathrooms: bathrooms === "" ? null : Number(bathrooms),
          areaM2: areaM2 === "" ? null : Number(areaM2),
          builtAreaM2: builtAreaM2 === "" ? null : Number(builtAreaM2),
          lotAreaM2: lotAreaM2 === "" ? null : Number(lotAreaM2),
          privateAreaM2: privateAreaM2 === "" ? null : Number(privateAreaM2),
          usableAreaM2: usableAreaM2 === "" ? null : Number(usableAreaM2),
          suites: suites === "" ? null : Number(suites as any),
          parkingSpots: parkingSpots === "" ? null : Number(parkingSpots as any),
          floor: floor === "" ? null : Number(floor as any),
          yearBuilt: yearBuilt === "" ? null : Number(yearBuilt as any),
          // Lazer / Condomínio
          hasBalcony,
          hasElevator,
          hasPool,
          hasGym,
          hasPlayground,
          hasPartyRoom,
          hasGourmet,
          hasConcierge24h,
          // Acessibilidade
          accRamps,
          accWideDoors,
          accAccessibleElevator,
          accTactile,
          // Conforto / Energia
          comfortAC,
          comfortHeating,
          comfortSolar,
          comfortNoiseWindows,
          comfortLED,
          comfortWaterReuse,
          // Acabamentos
          finishFloor: !finishFloor ? null : (finishFloor === 'porcelanato' ? 'PORCELANATO' : finishFloor === 'madeira' ? 'MADEIRA' : finishFloor === 'vinilico' ? 'VINILICO' : 'OUTRO'),
          finishCabinets,
          finishCounterGranite,
          finishCounterQuartz,
          // Vista / Posição
          viewSea,
          viewCity,
          positionFront,
          positionBack,
          sunByRoomNote,
          // Pets / Políticas
          petsSmall,
          petsLarge,
          condoRules,
          // Outros
          sunOrientation: !sunOrientation ? null : (sunOrientation.toUpperCase() === 'NASCENTE' ? 'NASCENTE' : sunOrientation.toUpperCase() === 'POENTE' ? 'POENTE' : 'OUTRA'),
          yearRenovated: yearRenovated === "" ? null : Number(yearRenovated as any),
          totalFloors: totalFloors === "" ? null : Number(totalFloors as any),
        },
        // Dados privados do proprietário (visíveis apenas para o dono)
        privateData: {
          ownerName: privateOwnerName || null,
          ownerPhone: privateOwnerPhone || null,
          ownerEmail: privateOwnerEmail || null,
          ownerAddress: privateOwnerAddress || null,
          ownerPrice: privateOwnerPriceBRL ? parseBRLToNumber(privateOwnerPriceBRL) * 100 : null,
          brokerFeePercent: privateBrokerFeePercent ? parseFloat(privateBrokerFeePercent.replace(',', '.')) : null,
          brokerFeeFixed: privateBrokerFeeFixedBRL ? parseBRLToNumber(privateBrokerFeeFixedBRL) * 100 : null,
          exclusive: privateExclusive,
          exclusiveUntil: privateExclusiveUntil ? new Date(privateExclusiveUntil).toISOString() : null,
          occupied: privateOccupied,
          occupantInfo: privateOccupantInfo || null,
          keyLocation: privateKeyLocation || null,
          notes: privateNotes || null,
        },
        // Configurações de visibilidade
        visibility: {
          hidePrice,
          hideExactAddress,
          hideOwnerContact,
          hideCondoFee,
          hideIPTU,
          iptuYearly: iptuYearBRL ? parseBRLToNumber(iptuYearBRL) * 100 : null,
        },
        conditionTags: mergedTags,
        images: images
          .filter((img) => typeof img.url === 'string' && /^https?:\/\//.test(img.url))
          .map((img, i) => ({ url: img.url, alt: img.alt, sortOrder: i })),
      };

      const parsed = PropertyCreateSchema.safeParse(payload);
      if (!parsed.success) {
        const next: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const p = issue.path.join(".");
          if (p === "title") next.title = "Informe um título válido.";
          else if (p === "metaTitle") next.metaTitle = "Meta Title deve ter no máximo 65 caracteres.";
          else if (p === "metaDescription") next.metaDescription = "Meta Description deve ter no máximo 155 caracteres.";
          else if (p === "videoUrl") next.videoUrl = "Link de vídeo inválido. Use YouTube ou Vimeo.";
          else if (p === "priceBRL") next.priceBRL = "Informe um preço válido.";
          else if (p === "type") next.type = "Selecione o tipo de imóvel.";
          else if (p === "address.postalCode") next.postalCode = "Informe um CEP válido.";
          else if (p === "address.street") next.street = "Informe a rua.";
          else if (p === "address.neighborhood") next.neighborhood = "Informe o bairro.";
          else if (p === "address.city") next.city = "Informe a cidade.";
          else if (p === "address.state") next.state = "Informe o estado (UF).";
          else if (p === "geo.lat" || p === "geo.lng") next.geo = "Valide o endereço no mapa.";
          else if (p === "details.bedrooms") next.bedrooms = "Informe um número válido de quartos.";
          else if (p === "details.bathrooms") next.bathrooms = "Informe um número válido de banheiros.";
          else if (p === "details.areaM2") next.areaM2 = "Informe uma área válida.";
          else if (p === "details.builtAreaM2") next.builtAreaM2 = "Informe uma área construída válida.";
          else if (p === "details.lotAreaM2") next.lotAreaM2 = "Informe uma área de terreno válida.";
          else if (p === "details.privateAreaM2") next.privateAreaM2 = "Informe uma área privativa válida.";
          else if (p === "details.usableAreaM2") next.usableAreaM2 = "Informe uma área útil válida.";
          else if (p === "details.suites") next.suites = "Informe um número válido de suítes.";
          else if (p === "details.parkingSpots") next.parkingSpots = "Informe um número válido de vagas.";
          else if (p === "details.floor") next.floor = "Informe um andar válido.";
          else if (p === "details.totalFloors") next.totalFloors = "Informe o total de andares válido.";
          else if (p === "details.yearBuilt") next.yearBuilt = "Ano de construção deve ser entre 1800 e 2100.";
          else if (p === "details.yearRenovated") next.yearRenovated = "Ano de reforma deve ser entre 1800 e 2100.";
          else if (p === "visibility.iptuYearly") next.iptuYearBRL = "Informe um valor de IPTU válido.";
          else if (p.startsWith("images")) next.images = "Adicione ao menos uma foto válida.";
        }

        if (Object.keys(next).length) {
          openPublishIssues(next, {
            title: "Confira os campos antes de publicar",
            message: "Revise os itens abaixo e tente novamente.",
          });
        }
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
      if (res.status === 429) {
        openPublishIssues(
          {
            publish: "Muitas requisições. Aguarde um pouco e tente novamente.",
          },
          {
            title: "Ajuste antes de publicar",
            technical: { status: res.status, requestId: res.headers.get("x-request-id") || undefined },
          }
        );
        return;
      }
      if (!res.ok) {
        let msg = "Falha ao criar imóvel";
        let issues: any[] | undefined;
        try {
          const j = await res.json();
          if (typeof j?.message === "string" && j.message.trim()) msg = j.message;
          else if (typeof j?.error === "string" && j.error.trim()) msg = j.error;
          if (Array.isArray(j?.issues)) issues = j.issues;
        } catch {}

        if (issues && issues.length) {
          const next: Record<string, string> = {};
          for (const issue of issues) {
            const p = Array.isArray(issue?.path) ? issue.path.join(".") : String(issue?.path || "");
            if (p === "title") next.title = "Informe um título válido.";
            else if (p === "metaTitle") next.metaTitle = "Meta Title deve ter no máximo 65 caracteres.";
            else if (p === "metaDescription") next.metaDescription = "Meta Description deve ter no máximo 155 caracteres.";
            else if (p === "videoUrl") next.videoUrl = "Link de vídeo inválido. Use YouTube ou Vimeo.";
            else if (p === "priceBRL") next.priceBRL = "Informe um preço válido.";
            else if (p === "type") next.type = "Selecione o tipo de imóvel.";
            else if (p === "address.postalCode") next.postalCode = "Informe um CEP válido.";
            else if (p === "address.street") next.street = "Informe a rua.";
            else if (p === "address.neighborhood") next.neighborhood = "Informe o bairro.";
            else if (p === "address.city") next.city = "Informe a cidade.";
            else if (p === "address.state") next.state = "Informe o estado (UF).";
            else if (p === "geo.lat" || p === "geo.lng") next.geo = "Valide o endereço no mapa.";
            else if (p === "details.bedrooms") next.bedrooms = "Informe um número válido de quartos.";
            else if (p === "details.bathrooms") next.bathrooms = "Informe um número válido de banheiros.";
            else if (p === "details.areaM2") next.areaM2 = "Informe uma área válida.";
            else if (p === "details.builtAreaM2") next.builtAreaM2 = "Informe uma área construída válida.";
            else if (p === "details.lotAreaM2") next.lotAreaM2 = "Informe uma área de terreno válida.";
            else if (p === "details.privateAreaM2") next.privateAreaM2 = "Informe uma área privativa válida.";
            else if (p === "details.usableAreaM2") next.usableAreaM2 = "Informe uma área útil válida.";
            else if (p === "details.suites") next.suites = "Informe um número válido de suítes.";
            else if (p === "details.parkingSpots") next.parkingSpots = "Informe um número válido de vagas.";
            else if (p === "details.floor") next.floor = "Informe um andar válido.";
            else if (p === "details.totalFloors") next.totalFloors = "Informe o total de andares válido.";
            else if (p === "details.yearBuilt") next.yearBuilt = "Ano de construção deve ser entre 1800 e 2100.";
            else if (p === "details.yearRenovated") next.yearRenovated = "Ano de reforma deve ser entre 1800 e 2100.";
            else if (p === "visibility.iptuYearly") next.iptuYearBRL = "Informe um valor de IPTU válido.";
            else if (p.startsWith("images")) next.images = "Adicione ao menos uma foto válida.";
          }

          if (Object.keys(next).length) {
            openPublishIssues(next, {
              title: "Confira os campos antes de publicar",
              message: "Revise os itens abaixo e tente novamente.",
              technical: { status: res.status, requestId: res.headers.get("x-request-id") || undefined },
            });
            return;
          }
        }

        openPublishIssues(
          { publish: msg },
          {
            title: "Ajuste antes de publicar",
            technical: { status: res.status, requestId: res.headers.get("x-request-id") || undefined },
          }
        );
        return;
      }

      const result = await res.json();
      
      // Mostrar tela de sucesso com compartilhamento
      const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const propertyUrl = `${siteUrl}${buildPropertyPath(result.id, finalTitle)}`;
      
      // Limpa rascunho após publicação bem-sucedida
      clearDraft();
      resetForm();

      setPublishedProperty({
        id: result.id,
        title: finalTitle,
        url: propertyUrl,
      });
      
      setToast({ message: "Imóvel publicado com sucesso!", type: "success" });
    } catch (err: any) {
      console.error("Error publishing property:", err);
      if (err?.name === "AbortError") {
        openPublishIssues(
          { publish: "A publicação demorou demais para responder. Tente novamente em instantes." },
          { title: "Tempo limite ao publicar" }
        );
        return;
      }
      const msg =
        typeof err?.message === "string" && err.message.trim()
          ? err.message
          : "Não foi possível publicar o imóvel agora.";
      openPublishIssues({ publish: msg }, { title: "Ajuste antes de publicar" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const nextStep = async () => {
    setFieldErrors({});
    // Step 1: validações básicas
    if (currentStep === 1) {
      if (!purpose) {
        applyErrorsAndFocus(1, { purpose: "Selecione a finalidade (Venda/Aluguel)." });
        return;
      }
      const price = parseBRLToNumber(priceBRL);
      if (!price || price <= 0) {
        applyErrorsAndFocus(1, { priceBRL: "Informe um preço válido (maior que zero)." });
        return;
      }
      if (!type) {
        applyErrorsAndFocus(1, { type: "Selecione o tipo de imóvel." });
        return;
      }

      // Validação de endereço (agora no Step 1)
      const cepDigits = postalCode.replace(/\D+/g, "");
      if (postalCode && cepDigits.length !== 8) {
        applyErrorsAndFocus(1, { postalCode: "Informe um CEP válido (8 dígitos)." });
        return;
      }
      if (!street || !neighborhood || !city || !state) {
        const errs: Record<string, string> = {};
        if (!street) errs.street = "Informe a rua.";
        if (!neighborhood) errs.neighborhood = "Informe o bairro.";
        if (!city) errs.city = "Informe a cidade.";
        if (!state) errs.state = "Informe o estado (UF).";
        applyErrorsAndFocus(1, errs);
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
        setGeo(null);
        setGeoPreview("");
        setToast({ message: "Não conseguimos validar o endereço no mapa agora. Você pode continuar e ajustar depois.", type: "info" });
      } else {
        setGeo({ lat: res.lat, lng: res.lng });
        setGeoPreview(res.displayName || `${res.lat},${res.lng}`);
      }
    }
    // Step 3: sanidade dos números (quando fornecidos)
    if (currentStep === 2) {
      const errs: Record<string, string> = {};
      const checkNonNeg = (key: string, label: string, v: any) => {
        if (v === "" || v === null || v === undefined) return;
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) errs[key] = `${label} deve ser 0 ou maior.`;
      };
      checkNonNeg("bedrooms", "Quartos", bedrooms);
      checkNonNeg("bathrooms", "Banheiros", bathrooms);
      checkNonNeg("areaM2", "Área", areaM2);
      checkNonNeg("builtAreaM2", "Área construída", builtAreaM2);
      checkNonNeg("lotAreaM2", "Área do terreno", lotAreaM2);
      checkNonNeg("privateAreaM2", "Área privativa", privateAreaM2);
      checkNonNeg("usableAreaM2", "Área útil", usableAreaM2);
      checkNonNeg("suites", "Suítes", suites);
      checkNonNeg("parkingSpots", "Vagas", parkingSpots);
      checkNonNeg("floor", "Andar", floor);
      checkNonNeg("totalFloors", "Total de andares", totalFloors);

      if (areaM2 !== "" && areaM2 !== null && areaM2 !== undefined) {
        const n = Number(areaM2);
        if (Number.isFinite(n) && n > 20000) errs.areaM2 = "Área muito grande. Verifique o valor informado.";
      }

      const checkYear = (key: string, label: string, v: any) => {
        if (v === "" || v === null || v === undefined) return;
        const n = Number(v);
        if (!Number.isFinite(n)) {
          errs[key] = `${label} deve ser um número válido.`;
          return;
        }
        if (n < 1800 || n > 2100) {
          errs[key] = `${label} deve ser entre 1800 e 2100.`;
        }
      };
      checkYear("yearBuilt", "Ano de construção", yearBuilt);
      checkYear("yearRenovated", "Ano de reforma", yearRenovated);

      if (Object.keys(errs).length) {
        applyErrorsAndFocus(2, errs);
        return;
      }
    }
    // Step 4: ao menos 1 imagem
    if (currentStep === 3) {
      const hasImage = images.some((it) => it.url && it.url.trim().length > 0);
      if (!hasImage) {
        applyErrorsAndFocus(3, { images: "Adicione ao menos uma foto do imóvel." });
        return;
      }
    }

    // Step 5: título + metas
    if (currentStep === 4) {
      const errs: Record<string, string> = {};
      if (finalTitle.length < 3) errs.title = "Informe um título para o anúncio.";
      if (metaTitle && metaTitle.length > 65) errs.metaTitle = "Meta Title deve ter no máximo 65 caracteres.";
      if (metaDescription && metaDescription.length > 155) errs.metaDescription = "Meta Description deve ter no máximo 155 caracteres.";
      if (videoUrl && !parseVideoUrl(videoUrl)) errs.videoUrl = "Link de vídeo inválido. Use YouTube ou Vimeo.";
      if (Object.keys(errs).length) {
        applyErrorsAndFocus(4, errs);
        return;
      }
    }

    // Step 6: dados do proprietário (opcional, pode pular)
    // Step 6: dados do proprietário (opcional, pode pular)
    // Não há validação obrigatória neste step
    
    if (currentStep < 6) setCurrentStep(currentStep + 1);
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
        { label: "Novo Anúncio" },
      ]}
    >
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Tela de Sucesso com Compartilhamento */}
      {publishedProperty && (
        <div className="mx-auto max-w-2xl px-4 py-12">
          <div className="rounded-2xl bg-white shadow-lg ring-1 ring-black/5 overflow-hidden">
            {/* Header com gradiente */}
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-8 text-center text-white">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-2">Anúncio publicado!</h1>
              <p className="text-white/90">Seu imóvel já está disponível na plataforma</p>
            </div>
            
            {/* Conteúdo */}
            <div className="p-6 space-y-6">
              {/* Preview do título */}
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Título do anúncio</p>
                <p className="text-lg font-semibold text-gray-900">{publishedProperty.title}</p>
              </div>
              
              {/* Compartilhamento */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3 text-center">Compartilhe seu anúncio</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {/* WhatsApp */}
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Confira este imóvel: ${publishedProperty.title}\n${publishedProperty.url}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </a>

                  {/* Instagram */}
                  <button
                    type="button"
                    onClick={async () => {
                      const shareUrl = publishedProperty.url;
                      const shareTitle = publishedProperty.title;

                      const ua =
                        typeof navigator !== "undefined"
                          ? String((navigator as any).userAgent || "")
                          : "";
                      const isMobileUa =
                        (navigator as any)?.userAgentData?.mobile === true ||
                        /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

                      if (isMobileUa && typeof navigator !== "undefined" && "share" in navigator) {
                        try {
                          await (navigator as any).share({
                            title: shareTitle,
                            text: `Confira este imóvel: ${shareTitle}`,
                            url: shareUrl,
                          });
                          setToast({
                            message:
                              "Compartilhamento iniciado. Selecione o Instagram no menu de compartilhamento.",
                            type: "success",
                          });
                          return;
                        } catch {
                          // fallback to clipboard
                        }
                      }

                      let copied = false;
                      try {
                        await navigator.clipboard.writeText(shareUrl);
                        copied = true;
                      } catch {
                        copied = false;
                      }
                      try {
                        window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
                      } catch {}

                      setToast({
                        message: copied
                          ? "Link copiado! O Instagram não permite compartilhamento automático no desktop — cole o link na legenda/Stories."
                          : "O Instagram não permite compartilhamento automático no desktop — copie o link abaixo e cole na legenda/Stories.",
                        type: copied ? "success" : "info",
                      });
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white font-medium hover:from-fuchsia-700 hover:to-pink-700 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5zM17.75 6.25a1 1 0 1 1-1 1 1 1 0 0 1 1-1z" />
                    </svg>
                    Instagram (copiar link)
                  </button>
                  
                  {/* Facebook */}
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publishedProperty.url)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </a>
                  
                  {/* Copiar Link */}
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(publishedProperty.url);
                        setToast({ message: "Link copiado!", type: "success" });
                      } catch {
                        setToast({ message: "Não foi possível copiar automaticamente. Copie o link abaixo.", type: "info" });
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copiar Link
                  </button>
                </div>
              </div>
              
              {/* Link do anúncio */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Link do anúncio</p>
                <p className="text-sm text-gray-700 break-all font-mono">{publishedProperty.url}</p>
              </div>
              
              {/* Ações */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href={buildPropertyPath(publishedProperty.id, publishedProperty.title)}
                  className="flex-1 text-center px-4 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors"
                >
                  Ver anúncio
                </Link>
                <button
                  onClick={() => {
                    setPublishedProperty(null);
                    clearDraft();
                    resetForm();
                  }}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Publicar outro
                </button>
                <Link
                  href="/owner/properties"
                  className="flex-1 text-center px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Meus anúncios
                </Link>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Formulário de criação */}
      {!publishedProperty && (
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-6 rounded-xl border border-teal-100 bg-teal/5 px-4 py-3 text-sm text-gray-800">
            <p className="font-semibold mb-1">Antes de publicar seu imóvel</p>
            <p>
              Para publicar, você precisa ter pelo menos um canal verificado (telefone ou e-mail). Você pode ajustar isso em{' '}
              <Link href="/profile" className="font-semibold text-teal hover:text-teal-dark underline-offset-2 hover:underline">Meu Perfil</Link>.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <form ref={formRef} onSubmit={handleSubmit}>
                <div className="flex items-center justify-end">
                  <span className="text-xs text-gray-500">
                    Etapa {currentStep} de {steps.length}
                  </span>
                </div>

                <div
                  ref={stepperScrollRef}
                  className="bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/40 px-2 py-3 rounded-xl ring-1 ring-black/5 overflow-x-auto mb-8"
                >
                  <div className="flex items-center w-max gap-4">
                    {steps.map((step, index) => (
                      <div
                        key={step.id}
                        ref={(el) => {
                          stepperItemRefs.current[step.id] = el;
                        }}
                        className="flex items-center"
                      >
                        <div
                          className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                            currentStep >= step.id
                              ? 'glass-teal border-emerald-500 text-white'
                              : 'bg-white border-gray-300 text-gray-500'
                          }`}
                        >
                          {step.id}
                        </div>
                        <div className="ml-3 hidden sm:block min-w-[120px]">
                          <div
                            className={`text-sm font-medium ${
                              currentStep >= step.id ? 'text-emerald-700' : 'text-gray-500'
                            }`}
                          >
                            {step.name}
                          </div>
                          <div className="text-xs text-gray-500">{step.description}</div>
                        </div>
                        {index < steps.length - 1 && (
                          <div
                            className={`w-12 sm:w-16 h-0.5 mx-2 sm:mx-4 transition-all duration-200 ${
                              currentStep > step.id ? 'glass-teal' : 'bg-gray-300'
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sm:hidden fixed inset-x-0 bottom-0 z-[3000] bg-white/90 backdrop-blur border-t p-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={prevStep}
                      disabled={currentStep === 1}
                      className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold shadow border border-emerald-500 text-emerald-700 bg-white hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Voltar para etapa anterior
                    </button>
                    {currentStep < 6 ? (
                      <button
                        type="button"
                        onClick={nextStep}
                        className="flex-1 px-3 py-2 glass-teal text-sm font-semibold text-white rounded-lg shadow"
                      >
                        {isGeocoding && currentStep === 1 ? "Validando..." : "Próximo"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (isSubmitting) return;
                          setSubmitIntent(true);
                          void handleSubmit({ preventDefault: () => {} } as any);
                        }}
                        disabled={isSubmitting || images.some((i) => i.pending)}
                        className="flex-1 px-3 py-2 glass-teal text-sm font-semibold text-white rounded-lg disabled:opacity-70 shadow"
                      >
                        {isSubmitting ? "Publicando..." : images.some((i) => i.pending) ? "Aguardando" : "Publicar"}
                      </button>
                    )}
                  </div>
                </div>

              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Select
                        id="purpose"
                        label="Finalidade *"
                        value={purpose}
                        error={fieldErrors.purpose}
                        onChange={(e) => {
                          setPurpose(e.target.value as any);
                          clearFieldError("purpose");
                        }}
                      >
                        <option value="">Selecione</option>
                        <option value="SALE">Venda</option>
                        <option value="RENT">Aluguel</option>
                      </Select>
                    </div>
                    <div>
                      <Input
                        id="priceBRL"
                        label="Preço (R$) *"
                        value={priceBRL}
                        error={fieldErrors.priceBRL}
                        onChange={(e) => {
                          setPriceBRL(formatBRLInput(e.target.value));
                          clearFieldError("priceBRL");
                        }}
                        placeholder="Ex: 450.000"
                        inputMode="numeric"
                      />
                    </div>
                    <div>
                      <Select
                        id="type"
                        label="Tipo de imóvel *"
                        value={type}
                        error={fieldErrors.type}
                        onChange={(e) => {
                          setType(e.target.value);
                          clearFieldError("type");
                        }}
                      >
                        <option value="HOUSE">Casa</option>
                        <option value="APARTMENT">Apartamento</option>
                        <option value="CONDO">Condomínio</option>
                        <option value="TOWNHOUSE">Sobrado</option>
                        <option value="STUDIO">Studio/Kitnet</option>
                        <option value="LAND">Terreno</option>
                        <option value="RURAL">Imóvel rural</option>
                        <option value="COMMERCIAL">Comercial</option>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-gray-900">Localização</h2>
                      <button
                        type="button"
                        onClick={clearLocationFields}
                        className="text-xs font-semibold text-gray-600 hover:text-gray-800"
                      >
                        Limpar campos
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">
                      Informe o CEP e o endereço completo. Usamos essas informações para posicionar o imóvel no mapa e melhorar a
                      busca.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Input
                        id="postalCode"
                        label="CEP *"
                        value={postalCode}
                        error={fieldErrors.postalCode}
                        onChange={(e) => {
                          setPostalCode(formatCEP(e.target.value));
                          clearFieldError("postalCode");
                        }}
                        placeholder="Ex: 56300-000"
                        inputMode="numeric"
                      />
                      <Input
                        id="street"
                        label="Rua *"
                        value={street}
                        error={fieldErrors.street}
                        onChange={(e) => {
                          setStreet(e.target.value);
                          clearFieldError("street");
                        }}
                      />
                      <Input
                        id="addressNumber"
                        ref={numberInputRef}
                        label="Número"
                        value={addressNumber}
                        onChange={(e) => setAddressNumber(e.target.value)}
                        optional
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Input
                        id="neighborhood"
                        label="Bairro *"
                        value={neighborhood}
                        error={fieldErrors.neighborhood}
                        onChange={(e) => {
                          setNeighborhood(e.target.value);
                          clearFieldError("neighborhood");
                        }}
                      />
                      <Input
                        id="city"
                        label="Cidade *"
                        value={city}
                        error={fieldErrors.city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          clearFieldError("city");
                        }}
                      />
                      <Input
                        id="state"
                        label="Estado (UF) *"
                        value={state}
                        error={fieldErrors.state}
                        onChange={(e) => {
                          setState(e.target.value.toUpperCase());
                          clearFieldError("state");
                        }}
                        maxLength={2}
                      />
                    </div>

                    {addressString && (
                      <p className="text-xs text-gray-500">Endereço atual: {addressString}</p>
                    )}

                    <div className="mt-4">
                      {fieldErrors.geo && <div id="geo" className="mb-2 text-xs text-danger">{fieldErrors.geo}</div>}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {isGeocoding ? (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
                          ) : (
                            <MapPinIcon className="w-3.5 h-3.5 text-teal-700" />
                          )}
                          <span className="text-xs text-gray-600 truncate">
                            {isGeocoding
                              ? "Atualizando mapa..."
                              : geoPreview
                              ? `Ponto aproximado: ${geoPreview}`
                              : "O mapa é atualizado automaticamente conforme você preenche o endereço."}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleGeocode}
                          disabled={isGeocoding || !addressString}
                          className="text-xs font-semibold text-teal-700 hover:text-teal-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Atualizar
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 h-64 rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                      <div ref={mapContainerRef} className="w-full h-full" />
                    </div>
                  </div>

                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Descrição do imóvel</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Preencha título, descrição e metas com IA (1 preenchimento gratuito por anúncio) e depois edite como quiser.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      disabled={
                        isGeneratingDescription ||
                        aiDescriptionGenerations >= 1 ||
                        images.some((i) => i.pending) ||
                        !images.some((i) => i.url && !i.pending)
                      }
                      onClick={async () => {
                        if (isGeneratingDescription) return;
                        const readyImages = images
                          .filter((i) => i.url && !i.pending)
                          .map((i) => i.url)
                          .slice(0, 10);
                        if (readyImages.length === 0) {
                          setToast({ message: "Adicione ao menos 1 foto antes de gerar a descrição.", type: "error" });
                          return;
                        }

                        setIsGeneratingDescription(true);
                        setAiGenerateWarning(null);
                        try {
                          const res = await fetch("/api/ai/property-description", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              title: finalTitle ? finalTitle : null,
                              type,
                              purpose: purpose || null,
                              priceBRL: parseBRLToNumber(priceBRL) || null,
                              neighborhood: neighborhood || null,
                              city: city || null,
                              state: state || null,
                              bedrooms: bedrooms === "" ? null : Number(bedrooms),
                              bathrooms: bathrooms === "" ? null : Number(bathrooms),
                              areaM2: areaM2 === "" ? null : Number(areaM2),
                              conditionTags,
                              amenities: {
                                hasBalcony,
                                hasElevator,
                                hasPool,
                                hasGym,
                                hasPlayground,
                                hasPartyRoom,
                                hasGourmet,
                                hasConcierge24h,
                              },
                              images: readyImages,
                            }),
                          });

                          const json = await res.json().catch(() => null);
                          if (res.status === 429) {
                            setAiDescriptionGenerations(1);
                            setToast({ message: json?.error || "Limite atingido para este imóvel", type: "error" });
                            return;
                          }
                          if (!res.ok) {
                            setToast({ message: json?.error || "Falha ao gerar descrição", type: "error" });
                            return;
                          }

                          const nextTitle = (json?.data?.title as string | undefined) || "";
                          const nextMetaTitle = (json?.data?.metaTitle as string | undefined) || "";
                          const nextMetaDescription = (json?.data?.metaDescription as string | undefined) || "";
                          const text = (json?.data?.description as string | undefined) || "";

                          const warning = json?.data?._aiWarning;
                          if (warning || !text.trim()) {
                            setAiGenerateWarning(
                              "A OpenAI está passando por dificuldades técnicas no momento. Por favor, preencha o título e o texto do anúncio manualmente e tente novamente mais tarde."
                            );
                            setToast({ message: "IA indisponível no momento — preencha manualmente.", type: "info" });
                          }

                          // Se a IA voltou em modo fallback, o backend pode enviar description vazia.
                          // Nesses casos, não bloqueia o usuário com erro e não sobrescreve campos com vazio.

                          if (nextTitle.trim()) setCustomTitle(nextTitle);
                          if (text.trim()) setDescription(text);
                          if (nextMetaTitle.trim()) setMetaTitle(nextMetaTitle);
                          if (nextMetaDescription.trim()) setMetaDescription(nextMetaDescription);
                          setAiDescriptionGenerations(1);
                          setToast({ message: warning || !text.trim() ? "Campos atualizados (revise manualmente)." : "Campos preenchidos com IA!", type: warning || !text.trim() ? "info" : "success" });
                        } catch {
                          setAiGenerateWarning(
                            "A OpenAI está passando por dificuldades técnicas no momento. Por favor, preencha o título e o texto do anúncio manualmente e tente novamente mais tarde."
                          );
                          setToast({ message: "IA indisponível no momento — preencha manualmente.", type: "info" });
                        } finally {
                          setIsGeneratingDescription(false);
                        }
                      }}
                      className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingDescription
                        ? "Gerando..."
                        : aiDescriptionGenerations >= 1
                        ? "Limite atingido"
                        : "Preencher Campos com IA"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDescription("");
                        setMetaTitle("");
                        setMetaDescription("");
                        setVideoUrl("");
                      }}
                      className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50"
                    >
                      Limpar campos
                    </button>
                  </div>

                  <div className="pt-2">
                    <Input
                      id="title"
                      type="text"
                      label="Título do anúncio *"
                      value={customTitle}
                      error={fieldErrors.title}
                      onChange={(e) => {
                        setCustomTitle(e.target.value);
                        clearFieldError("title");
                        setAiGenerateWarning(null);
                      }}
                      placeholder="Ex: Casa em Petrolina"
                      maxLength={70}
                    />
                    {aiGenerateWarning && (
                      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        {aiGenerateWarning}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Input
                        id="metaTitle"
                        type="text"
                        label="Meta Title"
                        value={metaTitle}
                        onChange={(e) => {
                          setMetaTitle(e.target.value);
                          clearFieldError("metaTitle");
                        }}
                        placeholder="Título otimizado para Google (até 65 caracteres)"
                        maxLength={65}
                        error={fieldErrors.metaTitle}
                      />
                      <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                        <span />
                        <span>{metaTitle.length}/65</span>
                      </div>
                    </div>
                    <div>
                      <Input
                        id="metaDescription"
                        type="text"
                        label="Meta Description"
                        value={metaDescription}
                        onChange={(e) => {
                          setMetaDescription(e.target.value);
                          clearFieldError("metaDescription");
                        }}
                        placeholder="Descrição curta para Google (até 155 caracteres)"
                        maxLength={155}
                        error={fieldErrors.metaDescription}
                      />
                      <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                        <span />
                        <span>{metaDescription.length}/155</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-xl p-4 bg-white">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Vídeo do imóvel (YouTube/Vimeo)</h3>
                        <p className="text-xs text-gray-600 mt-1">Cole o link do vídeo. Opcional.</p>
                      </div>
                      {videoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setVideoUrl("");
                            clearFieldError("videoUrl");
                          }}
                          className="text-xs font-semibold text-gray-600 hover:text-gray-800"
                        >
                          Remover
                        </button>
                      )}
                    </div>

                    <div className="mt-3">
                      <Input
                        id="videoUrl"
                        label="Link do vídeo"
                        value={videoUrl}
                        error={fieldErrors.videoUrl}
                        onChange={(e) => {
                          const v = e.target.value;
                          setVideoUrl(v);
                          if (!v.trim()) {
                            clearFieldError("videoUrl");
                          }
                        }}
                        placeholder="https://youtu.be/... ou https://vimeo.com/..."
                        optional
                      />
                    </div>

                    {videoUrl && parseVideoUrl(videoUrl) && (
                      <div className="mt-3">
                        <div className="relative w-full overflow-hidden rounded-lg border border-gray-200 bg-black aspect-video">
                          <iframe
                            src={parseVideoUrl(videoUrl)?.embedUrl}
                            title="Vídeo do imóvel"
                            className="absolute inset-0 w-full h-full"
                            loading="lazy"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allow="autoplay; encrypted-media; picture-in-picture"
                            sandbox="allow-scripts allow-same-origin allow-presentation"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Textarea
                      label="Texto do anúncio"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={8}
                      className="resize-y"
                      placeholder="Use este espaço para explicar os pontos fortes do imóvel, estado de conservação, diferenciais, etc."
                    />
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {aiDescriptionGenerations >= 1
                          ? "Você já usou o preenchimento gratuito deste anúncio."
                          : "Você ainda tem 1 preenchimento gratuito para este anúncio."}
                      </span>
                      <span>{description.length} caracteres</span>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Detalhes do imóvel</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Informe quartos, banheiros, área e características. Quanto mais completo, melhor para quem está buscando.
                    </p>
                  </div>

                  {/* Números principais */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <Input id="bedrooms" label="Quartos" value={bedrooms} error={fieldErrors.bedrooms} onChange={(e) => { setBedrooms(e.target.value); clearFieldError("bedrooms"); }} inputMode="numeric" />
                    <Input id="bathrooms" label="Banheiros" value={bathrooms} error={fieldErrors.bathrooms} onChange={(e) => { setBathrooms(e.target.value); clearFieldError("bathrooms"); }} inputMode="numeric" />
                    <Input id="areaM2" label="Área (m²)" value={areaM2} error={fieldErrors.areaM2} onChange={(e) => { setAreaM2(e.target.value); clearFieldError("areaM2"); }} inputMode="numeric" />
                    <Input id="suites" label="Suítes" value={suites as any} error={fieldErrors.suites} onChange={(e) => { setSuites(e.target.value); clearFieldError("suites"); }} inputMode="numeric" optional />
                    <Input id="parkingSpots" label="Vagas" value={parkingSpots as any} error={fieldErrors.parkingSpots} onChange={(e) => { setParkingSpots(e.target.value); clearFieldError("parkingSpots"); }} inputMode="numeric" optional />
                    <Input id="floor" label="Andar" value={floor as any} error={fieldErrors.floor} onChange={(e) => { setFloor(e.target.value); clearFieldError("floor"); }} inputMode="numeric" optional />
                    <Input id="totalFloors" label="Total de andares" value={totalFloors as any} error={fieldErrors.totalFloors} onChange={(e) => { setTotalFloors(e.target.value); clearFieldError("totalFloors"); }} inputMode="numeric" optional />
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenAcc((p) => ({ ...p, acc_condition: !p.acc_condition }))}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <span className="text-sm font-semibold text-gray-800">
                        🛠️ Condição do imóvel
                        {accConditionCount > 0 && (
                          <span className="ml-2 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{accConditionCount}</span>
                        )}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${openAcc.acc_condition ? 'rotate-180' : ''}`} />
                    </button>
                    {openAcc.acc_condition && (
                      <div className="px-4 pb-4 pt-3 bg-gray-50/50 border-t border-gray-100">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {[...CONDITION_STATUS_OPTIONS, ...CONDITION_EXTRA_OPTIONS].map((tag) => (
                            <Checkbox
                              key={tag}
                              checked={conditionTags.includes(tag)}
                              onChange={() => toggleConditionTag(tag)}
                              label={tag}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenAcc((p) => ({ ...p, acc_measures: !p.acc_measures }))}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <span className="text-sm font-semibold text-gray-800">
                        📐 Medidas do imóvel
                        {accMeasuresCount > 0 && (
                          <span className="ml-2 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{accMeasuresCount}</span>
                        )}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${openAcc.acc_measures ? 'rotate-180' : ''}`} />
                    </button>
                    {openAcc.acc_measures && (
                      <div className="px-4 pb-4 pt-3 bg-gray-50/50 border-t border-gray-100">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <Input id="builtAreaM2" label="Área construída (m²)" value={builtAreaM2} error={fieldErrors.builtAreaM2} onChange={(e) => { setBuiltAreaM2(e.target.value); clearFieldError("builtAreaM2"); }} inputMode="numeric" optional />
                          <Input id="lotAreaM2" label="Área do terreno (m²)" value={lotAreaM2} error={fieldErrors.lotAreaM2} onChange={(e) => { setLotAreaM2(e.target.value); clearFieldError("lotAreaM2"); }} inputMode="numeric" optional />
                          <Input id="privateAreaM2" label="Área privativa (m²)" value={privateAreaM2} error={fieldErrors.privateAreaM2} onChange={(e) => { setPrivateAreaM2(e.target.value); clearFieldError("privateAreaM2"); }} inputMode="numeric" optional />
                          <Input id="usableAreaM2" label="Área útil (m²)" value={usableAreaM2} error={fieldErrors.usableAreaM2} onChange={(e) => { setUsableAreaM2(e.target.value); clearFieldError("usableAreaM2"); }} inputMode="numeric" optional />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenAcc((p) => ({ ...p, acc_features: !p.acc_features }))}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <span className="text-sm font-semibold text-gray-800">
                        🏠 Características do imóvel
                        {accFeaturesCount > 0 && (
                          <span className="ml-2 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{accFeaturesCount}</span>
                        )}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${openAcc.acc_features ? 'rotate-180' : ''}`} />
                    </button>
                    {openAcc.acc_features && (
                      <div className="px-4 pb-4 pt-3 bg-gray-50/50 border-t border-gray-100">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <Checkbox checked={hasBalcony} onChange={(e) => setHasBalcony(e.target.checked)} label="Varanda" />
                          <Checkbox
                            checked={petFriendly}
                            onChange={(e) => {
                              const next = e.target.checked;
                              setPetFriendly(next);
                              if (!next) {
                                setConditionTags((prev) => prev.filter((t) => t !== 'Aceita pets'));
                              }
                            }}
                            label="Aceita pets"
                          />
                          {PROPERTY_FEATURE_TAG_OPTIONS.map((tag) => (
                            <Checkbox
                              key={tag}
                              checked={conditionTags.includes(tag)}
                              onChange={() => toggleConditionTag(tag)}
                              label={tag}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenAcc((p) => ({ ...p, acc_condo: !p.acc_condo }))}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <span className="text-sm font-semibold text-gray-800">
                        🏢 Condomínio / áreas comuns
                        {accCondoCount > 0 && (
                          <span className="ml-2 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{accCondoCount}</span>
                        )}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${openAcc.acc_condo ? 'rotate-180' : ''}`} />
                    </button>
                    {openAcc.acc_condo && (
                      <div className="px-4 pb-4 pt-3 bg-gray-50/50 border-t border-gray-100">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <Checkbox checked={hasElevator} onChange={(e) => setHasElevator(e.target.checked)} label="Elevador" />
                          <Checkbox checked={hasPool} onChange={(e) => setHasPool(e.target.checked)} label="Piscina" />
                          <Checkbox checked={hasGym} onChange={(e) => setHasGym(e.target.checked)} label="Academia" />
                          <Checkbox checked={hasGourmet} onChange={(e) => setHasGourmet(e.target.checked)} label="Espaço gourmet" />
                          <Checkbox checked={hasPlayground} onChange={(e) => setHasPlayground(e.target.checked)} label="Playground" />
                          <Checkbox checked={hasPartyRoom} onChange={(e) => setHasPartyRoom(e.target.checked)} label="Salão de festas" />
                          <Checkbox checked={hasConcierge24h} onChange={(e) => setHasConcierge24h(e.target.checked)} label="Portaria 24h" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Segurança */}
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <button type="button" onClick={() => setOpenAcc(p => ({ ...p, acc_sec: !p.acc_sec }))} className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                      <span className="text-sm font-semibold text-gray-800">🔒 Segurança {accSecurityCount > 0 && <span className="ml-2 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{accSecurityCount}</span>}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${openAcc.acc_sec ? 'rotate-180' : ''}`} />
                    </button>
                    {openAcc.acc_sec && (
                      <div className="px-4 pb-4 pt-3 grid grid-cols-2 gap-3 bg-gray-50/50 border-t border-gray-100">
                        <Checkbox checked={secCCTV} onChange={(e) => setSecCCTV(e.target.checked)} label="CFTV / Câmeras" />
                        <Checkbox checked={secSallyPort} onChange={(e) => setSecSallyPort(e.target.checked)} label="Clausura (sally port)" />
                        <Checkbox checked={secNightGuard} onChange={(e) => setSecNightGuard(e.target.checked)} label="Ronda noturna" />
                        <Checkbox checked={secElectricFence} onChange={(e) => setSecElectricFence(e.target.checked)} label="Cerca elétrica" />
                      </div>
                    )}
                  </div>

                  {/* Conforto e Energia */}
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <button type="button" onClick={() => setOpenAcc(p => ({ ...p, acc_ce: !p.acc_ce }))} className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                      <span className="text-sm font-semibold text-gray-800">❄️ Conforto e Energia {accComfortCount > 0 && <span className="ml-2 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{accComfortCount}</span>}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${openAcc.acc_ce ? 'rotate-180' : ''}`} />
                    </button>
                    {openAcc.acc_ce && (
                      <div className="px-4 pb-4 pt-3 grid grid-cols-2 gap-3 bg-gray-50/50 border-t border-gray-100">
                        <Checkbox checked={comfortAC} onChange={(e) => setComfortAC(e.target.checked)} label="Ar-condicionado" />
                        <Checkbox checked={comfortHeating} onChange={(e) => setComfortHeating(e.target.checked)} label="Aquecimento" />
                        <Checkbox checked={comfortSolar} onChange={(e) => setComfortSolar(e.target.checked)} label="Energia solar" />
                        <Checkbox checked={comfortNoiseWindows} onChange={(e) => setComfortNoiseWindows(e.target.checked)} label="Janelas anti-ruído" />
                        <Checkbox checked={comfortLED} onChange={(e) => setComfortLED(e.target.checked)} label="Iluminação LED" />
                        <Checkbox checked={comfortWaterReuse} onChange={(e) => setComfortWaterReuse(e.target.checked)} label="Reúso de água" />
                      </div>
                    )}
                  </div>

                  {/* Acabamentos */}
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <button type="button" onClick={() => setOpenAcc(p => ({ ...p, acc_fin: !p.acc_fin }))} className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                      <span className="text-sm font-semibold text-gray-800">✨ Acabamentos {accFinishCount > 0 && <span className="ml-2 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{accFinishCount}</span>}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${openAcc.acc_fin ? 'rotate-180' : ''}`} />
                    </button>
                    {openAcc.acc_fin && (
                      <div className="px-4 pb-4 pt-3 space-y-3 bg-gray-50/50 border-t border-gray-100">
                        <Select label="Piso principal" value={finishFloor} onChange={(e) => setFinishFloor(e.target.value)} optional>
                          <option value="">Selecione</option>
                          <option value="porcelanato">Porcelanato</option>
                          <option value="madeira">Madeira</option>
                          <option value="vinilico">Vinílico</option>
                        </Select>
                        <div className="grid grid-cols-2 gap-3">
                          <Checkbox checked={finishCabinets} onChange={(e) => setFinishCabinets(e.target.checked)} label="Armários planejados" />
                          <Checkbox checked={finishCounterGranite} onChange={(e) => setFinishCounterGranite(e.target.checked)} label="Bancada granito" />
                          <Checkbox checked={finishCounterQuartz} onChange={(e) => setFinishCounterQuartz(e.target.checked)} label="Bancada quartzo" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Vista e Posição */}
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <button type="button" onClick={() => setOpenAcc(p => ({ ...p, acc_view: !p.acc_view }))} className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                      <span className="text-sm font-semibold text-gray-800">🌅 Vista e Posição {accViewCount > 0 && <span className="ml-2 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{accViewCount}</span>}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${openAcc.acc_view ? 'rotate-180' : ''}`} />
                    </button>
                    {openAcc.acc_view && (
                      <div className="px-4 pb-4 pt-3 space-y-3 bg-gray-50/50 border-t border-gray-100">
                        <div className="grid grid-cols-2 gap-3">
                          <Checkbox checked={viewSea} onChange={(e) => setViewSea(e.target.checked)} label="Vista para o mar" />
                          <Checkbox checked={viewCity} onChange={(e) => setViewCity(e.target.checked)} label="Vista para cidade" />
                          <Checkbox checked={positionFront} onChange={(e) => setPositionFront(e.target.checked)} label="De frente (voltado para a rua)" />
                          <Checkbox checked={positionBack} onChange={(e) => setPositionBack(e.target.checked)} label="Fundos (mais silencioso)" />
                        </div>
                        <Select label="Orientação do sol" value={sunOrientation} onChange={(e) => setSunOrientation(e.target.value)} optional>
                          <option value="">Selecione</option>
                          <option value="NASCENTE">Nascente (sol da manhã)</option>
                          <option value="POENTE">Poente (sol da tarde)</option>
                          <option value="OUTRA">Outra</option>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Acessibilidade */}
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <button type="button" onClick={() => setOpenAcc(p => ({ ...p, acc_acc: !p.acc_acc }))} className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                      <span className="text-sm font-semibold text-gray-800">♿ Acessibilidade {accAccessibilityCount > 0 && <span className="ml-2 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{accAccessibilityCount}</span>}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${openAcc.acc_acc ? 'rotate-180' : ''}`} />
                    </button>
                    {openAcc.acc_acc && (
                      <div className="px-4 pb-4 pt-3 grid grid-cols-2 gap-3 bg-gray-50/50 border-t border-gray-100">
                        <Checkbox checked={accRamps} onChange={(e) => setAccRamps(e.target.checked)} label="Rampas de acesso" />
                        <Checkbox checked={accWideDoors} onChange={(e) => setAccWideDoors(e.target.checked)} label="Portas largas" />
                        <Checkbox checked={accAccessibleElevator} onChange={(e) => setAccAccessibleElevator(e.target.checked)} label="Elevador acessível" />
                        <Checkbox checked={accTactile} onChange={(e) => setAccTactile(e.target.checked)} label="Piso tátil" />
                      </div>
                    )}
                  </div>

                  {/* Pets e Regras */}
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <button type="button" onClick={() => setOpenAcc(p => ({ ...p, acc_pets: !p.acc_pets }))} className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                      <span className="text-sm font-semibold text-gray-800">🐾 Pets e Regras {accPetsCount > 0 && <span className="ml-2 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{accPetsCount}</span>}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${openAcc.acc_pets ? 'rotate-180' : ''}`} />
                    </button>
                    {openAcc.acc_pets && (
                      <div className="px-4 pb-4 pt-3 space-y-3 bg-gray-50/50 border-t border-gray-100">
                        <div className="grid grid-cols-2 gap-3">
                          <Checkbox checked={petsSmall} onChange={(e) => setPetsSmall(e.target.checked)} label="Aceita pets pequenos" />
                          <Checkbox checked={petsLarge} onChange={(e) => setPetsLarge(e.target.checked)} label="Aceita pets grandes" />
                        </div>
                        <Input label="Regras do condomínio (breve)" value={condoRules} onChange={(e) => setCondoRules(e.target.value)} optional />
                      </div>
                    )}
                  </div>

                  {/* Ano e taxas */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input id="yearBuilt" label="Ano de construção" value={yearBuilt as any} error={fieldErrors.yearBuilt} onChange={(e) => { setYearBuilt(e.target.value); clearFieldError("yearBuilt"); }} inputMode="numeric" optional />
                    <Input id="yearRenovated" label="Ano de reforma" value={yearRenovated as any} error={fieldErrors.yearRenovated} onChange={(e) => { setYearRenovated(e.target.value); clearFieldError("yearRenovated"); }} inputMode="numeric" optional />
                    <Input label="Condomínio (R$/mês)" value={condoFeeBRL} onChange={(e) => setCondoFeeBRL(formatBRLInput(e.target.value))} inputMode="numeric" optional />
                    <Input id="iptuYearBRL" label="IPTU (R$/ano)" value={iptuYearBRL} error={fieldErrors.iptuYearBRL} onChange={(e) => { setIptuYearBRL(formatBRLInput(e.target.value)); clearFieldError("iptuYearBRL"); }} inputMode="numeric" optional />
                  </div>

                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Fotos do imóvel *</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Adicione ao menos uma foto. Arraste para reordenar — a primeira será a capa do anúncio.
                    </p>
                  </div>

                  {fieldErrors.images && (
                    <div id="images" className="text-xs text-danger">
                      {fieldErrors.images}
                    </div>
                  )}

                  {/* Área de upload */}
                  <div
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      isFileDragOver 
                        ? "border-teal-500 bg-teal-50 scale-[1.02]" 
                        : "border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400"
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsFileDragOver(true); }}
                    onDragLeave={() => setIsFileDragOver(false)}
                    onDrop={async (e) => {
                      e.preventDefault();
                      setIsFileDragOver(false);
                      clearFieldError("images");
                      if (e.dataTransfer?.files?.length) await handleDroppedFiles(e.dataTransfer.files);
                    }}
                    onClick={() => dropInputRef.current?.click()}
                  >
                    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br from-teal-100 to-blue-100 flex items-center justify-center">
                      <Camera className="w-7 h-7 text-teal-600" />
                    </div>
                    <p className="font-medium text-gray-800 mb-1">
                      <span className="sm:hidden">Toque para adicionar fotos</span>
                      <span className="hidden sm:inline">Clique ou arraste imagens</span>
                    </p>
                    <p className="text-sm text-gray-500">JPG, PNG • Máximo 10MB por foto</p>
                    <input
                      ref={dropInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        if (e.target.files?.length) {
                          clearFieldError("images");
                          await handleDroppedFiles(e.target.files);
                          e.target.value = "";
                        }
                      }}
                    />
                  </div>

                  {/* Contador e dicas */}
                  {images.filter(img => img.url).length > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        <span className="font-semibold text-gray-900">{images.filter(img => img.url).length}</span> foto(s) adicionada(s)
                      </span>
                      <span className="text-gray-500 text-xs">Arraste para reordenar</span>
                    </div>
                  )}

                  {/* Grid de imagens com drag & drop */}
                  {images.filter(img => img.url || img.pending).length > 0 && (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => {
                        const { active, over } = event;
                        if (over && active.id !== over.id) {
                          setImages((prev) => {
                            const oldIndex = prev.findIndex((_, i) => `img-${i}` === active.id);
                            const newIndex = prev.findIndex((_, i) => `img-${i}` === over.id);
                            return arrayMove(prev, oldIndex, newIndex);
                          });
                        }
                      }}
                    >
                      <SortableContext items={images.map((_, i) => `img-${i}`)} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          {images.map((img, idx) => {
                            if (!img.url && !img.pending) return null;
                            const isFirst = idx === 0;
                            return (
                              <SortableItem key={`img-${idx}`} id={`img-${idx}`}>
                                <div className="relative group aspect-square rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-100 hover:border-teal-400 transition-colors">
                                  {/* Badge CAPA */}
                                  {isFirst && img.url && (
                                    <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-gradient-to-r from-teal-600 to-teal-500 text-white text-xs font-bold rounded-md shadow-lg">
                                      📸 CAPA
                                    </div>
                                  )}

                                  {/* Imagem */}
                                  {img.url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={img.url}
                                      alt={img.alt || `Imagem ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                      draggable={false}
                                      onClick={(e) => { e.stopPropagation(); openLightbox(idx); }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                      <div className="text-center p-3">
                                        <div className="w-8 h-8 mx-auto mb-2 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
                                        <span className="text-xs text-gray-500">Enviando...</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Barra de progresso durante upload */}
                                  {img.pending && typeof img.progress === 'number' && (
                                    <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2">
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                          <div 
                                            className="h-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-300"
                                            style={{ width: `${img.progress}%` }}
                                          />
                                        </div>
                                        <span className="text-xs text-white font-medium">{img.progress}%</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Erro no upload */}
                                  {img.error && (
                                    <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
                                      <div className="text-center text-white p-2">
                                        <span className="text-2xl">⚠️</span>
                                        <p className="text-xs mt-1">{img.error}</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Overlay de ações */}
                                  {img.url && !img.pending && (
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-center opacity-0 group-hover:opacity-100">
                                      <div className="flex gap-2 p-3 w-full">
                                        {!isFirst && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setImages(prev => {
                                                const newArr = [...prev];
                                                const [item] = newArr.splice(idx, 1);
                                                newArr.unshift(item);
                                                return newArr;
                                              });
                                              setToast({ message: "Foto definida como capa!", type: "success" });
                                            }}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onTouchStart={(e) => e.stopPropagation()}
                                            className="flex-1 py-1.5 bg-white/90 hover:bg-white text-gray-800 text-xs font-semibold rounded-lg transition-colors"
                                          >
                                            Usar como capa
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            lastFocusRef.current = e.currentTarget;
                                            setConfirmDelete({ open: true, index: idx });
                                          }}
                                          onPointerDown={(e) => e.stopPropagation()}
                                          onMouseDown={(e) => e.stopPropagation()}
                                          onTouchStart={(e) => e.stopPropagation()}
                                          className="px-3 py-1.5 bg-red-500/90 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition-colors"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Indicador de drag */}
                                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="w-6 h-6 bg-white/90 rounded-md flex items-center justify-center shadow">
                                      <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                              </SortableItem>
                            );
                          })}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}

                  {/* Dica de qualidade */}
                  {images.filter(img => img.url).length > 0 && images.filter(img => img.url).length < 5 && (
                    <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <span className="text-lg">💡</span>
                      <div className="text-sm text-amber-800">
                        <p className="font-medium">Dica: Anúncios com 5+ fotos recebem 2x mais visualizações!</p>
                        <p className="text-amber-700 mt-0.5">Adicione mais fotos para destacar seu imóvel.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Dados do proprietário</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Informações internas para seu controle. Esses dados <strong>não aparecem no anúncio</strong> e só você pode ver.
                    </p>
                  </div>

                  {/* Informações de contato do proprietário */}
                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-medium text-gray-900 mb-3">Contato do proprietário</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Nome do proprietário"
                        value={privateOwnerName}
                        onChange={(e) => setPrivateOwnerName(e.target.value)}
                        placeholder="Ex: João Silva"
                      />
                      <Input
                        label="Telefone do proprietário"
                        value={privateOwnerPhone}
                        onChange={(e) => setPrivateOwnerPhone(e.target.value)}
                        placeholder="Ex: (11) 99999-9999"
                      />
                      <Input
                        label="E-mail do proprietário"
                        value={privateOwnerEmail}
                        onChange={(e) => setPrivateOwnerEmail(e.target.value)}
                        placeholder="Ex: joao@email.com"
                      />
                      <Input
                        label="Endereço do proprietário"
                        value={privateOwnerAddress}
                        onChange={(e) => setPrivateOwnerAddress(e.target.value)}
                        placeholder="Para correspondência"
                      />
                    </div>
                  </div>

                  {/* Informações financeiras */}
                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-medium text-gray-900 mb-3">Valores e comissão</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Input
                        label="Valor desejado pelo proprietário (R$)"
                        value={privateOwnerPriceBRL}
                        onChange={(e) => setPrivateOwnerPriceBRL(formatBRLInput(e.target.value))}
                        placeholder="Valor que ele quer receber"
                        inputMode="numeric"
                      />
                      <Input
                        label="Taxa de corretagem (%)"
                        value={privateBrokerFeePercent}
                        onChange={(e) => setPrivateBrokerFeePercent(e.target.value.replace(/[^0-9.,]/g, ''))}
                        placeholder="Ex: 5"
                        inputMode="decimal"
                      />
                      <Input
                        label="Ou taxa fixa (R$)"
                        value={privateBrokerFeeFixedBRL}
                        onChange={(e) => setPrivateBrokerFeeFixedBRL(formatBRLInput(e.target.value))}
                        placeholder="Ex: 10.000"
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  {/* Exclusividade */}
                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-medium text-gray-900 mb-3">Exclusividade</h3>
                    <div className="space-y-4">
                      <Checkbox
                        label="Imóvel exclusivo (só você pode vender)"
                        checked={privateExclusive}
                        onChange={(e) => setPrivateExclusive(e.target.checked)}
                      />
                      {privateExclusive && (
                        <Input
                          label="Exclusividade até"
                          type="date"
                          value={privateExclusiveUntil}
                          onChange={(e) => setPrivateExclusiveUntil(e.target.value)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Situação do imóvel */}
                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-medium text-gray-900 mb-3">Situação do imóvel</h3>
                    <div className="space-y-4">
                      <Checkbox
                        label="Imóvel está ocupado"
                        checked={privateOccupied}
                        onChange={(e) => setPrivateOccupied(e.target.checked)}
                      />
                      {privateOccupied && (
                        <Input
                          label="Quem mora / informações do contrato"
                          value={privateOccupantInfo}
                          onChange={(e) => setPrivateOccupantInfo(e.target.value)}
                          placeholder="Ex: Inquilino até dezembro, contrato de 12 meses"
                        />
                      )}
                      <Input
                        label="Onde está a chave"
                        value={privateKeyLocation}
                        onChange={(e) => setPrivateKeyLocation(e.target.value)}
                        placeholder="Ex: Com o porteiro, ou na imobiliária X"
                      />
                    </div>
                  </div>

                  {/* Notas internas */}
                  <div>
                    <Textarea
                      label="Observações internas"
                      value={privateNotes}
                      onChange={(e) => setPrivateNotes(e.target.value)}
                      rows={3}
                      className="resize-y"
                      placeholder="Anotações particulares sobre este imóvel ou negociação..."
                    />
                  </div>

                  {/* Seção de visibilidade */}
                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-2">Privacidade do anúncio</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Escolha quais informações devem ficar ocultas no anúncio público. Clientes interessados precisarão entrar em contato para saber.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <Checkbox
                          label="Ocultar preço (mostrar 'Consulte')"
                          checked={hidePrice}
                          onChange={(e) => setHidePrice(e.target.checked)}
                        />
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <Checkbox
                          label="Ocultar endereço exato (só bairro)"
                          checked={hideExactAddress}
                          onChange={(e) => setHideExactAddress(e.target.checked)}
                        />
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <Checkbox
                          label="Ocultar WhatsApp/telefone do anúncio (somente chat)"
                          checked={hideOwnerContact}
                          onChange={(e) => setHideOwnerContact(e.target.checked)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Se desmarcado, o botão de WhatsApp ficará disponível apenas para usuários logados e com e-mail verificado.
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <Checkbox
                          label="Ocultar taxa de condomínio"
                          checked={hideCondoFee}
                          onChange={(e) => setHideCondoFee(e.target.checked)}
                        />
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <Checkbox
                          label="Ocultar IPTU"
                          checked={hideIPTU}
                          onChange={(e) => setHideIPTU(e.target.checked)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          O valor do IPTU é informado na etapa de características do imóvel.
                        </p>
                      </div>
                    </div>

                    {/* Campo de IPTU */}
                  </div>

                  <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                    💡 Esses campos são opcionais e salvos junto com o imóvel. Você poderá editá-los depois na página do imóvel.
                  </p>
                </div>
              )}

              {currentStep === 6 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">Revisão final</h2>
                  <p className="text-sm text-gray-600">
                    Confira um resumo dos dados principais antes de publicar. Se algo estiver errado, volte para o passo
                    correspondente para ajustar.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
                    <div className="space-y-1">
                      <p><span className="font-medium">Finalidade:</span> {purpose === "RENT" ? "Aluguel" : "Venda"}</p>
                      <p><span className="font-medium">Preço:</span> R$ {parseBRLToNumber(priceBRL).toLocaleString("pt-BR")}</p>
                      <p><span className="font-medium">Tipo:</span> {type}</p>
                    </div>
                    <div className="space-y-1">
                      <p><span className="font-medium">Endereço:</span> {addressString || "Não informado"}</p>
                      <p><span className="font-medium">Quartos/Banheiros:</span> {bedrooms || "-"} / {bathrooms || "-"}</p>
                      <p><span className="font-medium">Área:</span> {areaM2 || "-"} m²</p>
                      {(builtAreaM2 || lotAreaM2 || privateAreaM2 || usableAreaM2) && (
                        <p className="text-gray-600">
                          <span className="font-medium">Medidas:</span>{" "}
                          {builtAreaM2 ? `Construída ${builtAreaM2}m²` : ""}
                          {builtAreaM2 && (lotAreaM2 || privateAreaM2 || usableAreaM2) ? " · " : ""}
                          {lotAreaM2 ? `Terreno ${lotAreaM2}m²` : ""}
                          {lotAreaM2 && (privateAreaM2 || usableAreaM2) ? " · " : ""}
                          {privateAreaM2 ? `Privativa ${privateAreaM2}m²` : ""}
                          {privateAreaM2 && usableAreaM2 ? " · " : ""}
                          {usableAreaM2 ? `Útil ${usableAreaM2}m²` : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="font-semibold text-gray-900 mb-3">Contato para publicação</p>

                    {fieldErrors.contactVerification && (
                      <div id="contactVerification" className="mb-2 text-xs text-danger">
                        {fieldErrors.contactVerification}
                      </div>
                    )}

                    {hasAnyVerifiedContact ? (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600">
                          Você já tem pelo menos um contato verificado. Você pode publicar seu anúncio.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-3 bg-white rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-teal-700" />
                              <p className="font-medium text-gray-900">Telefone</p>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{profilePhone || "Não cadastrado"}</p>
                            <p className={`text-xs mt-1 ${profilePhoneVerified ? "text-green-600" : "text-amber-600"}`}>
                              {profilePhoneVerified ? "Verificado" : "Não verificado"}
                            </p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-teal-700" />
                              <p className="font-medium text-gray-900">E-mail</p>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{profileEmail || "Não cadastrado"}</p>
                            <p className={`text-xs mt-1 ${profileEmailVerified ? "text-green-600" : "text-amber-600"}`}>
                              {profileEmailVerified ? "Verificado" : "Não verificado"}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          Se quiser alterar ou verificar outros contatos, vá em <Link href="/profile" className="text-teal-700 hover:underline">Meu Perfil</Link>.
                        </p>
                      </div>
                    ) : (
                      <>

                        <div className="space-y-3">
                          <p className="text-sm text-gray-600">
                            Para publicar, verifique pelo menos um canal de contato (telefone ou e-mail).
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3 bg-white rounded-lg border border-gray-200">
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-teal-700" />
                                <p className="font-medium text-gray-900">Telefone</p>
                              </div>

                              {profilePhone ? (
                                <div className="mt-2">
                                  <p className="text-sm text-gray-700">{profilePhone}</p>
                                  <p className="text-xs text-amber-600 mt-1">Não verificado</p>
                                  <button
                                    type="button"
                                    onClick={() => setShowPhoneVerificationModal(true)}
                                    className="mt-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
                                  >
                                    Verificar por SMS →
                                  </button>
                                </div>
                              ) : (
                                <div className="mt-2">
                                  <p className="text-sm text-gray-500">Você não tem telefone cadastrado.</p>
                                  <div className="mt-2 flex gap-2">
                                    <input
                                      type="tel"
                                      value={newPhoneInput}
                                      onChange={(e) => setNewPhoneInput(e.target.value.replace(/\D/g, ""))}
                                      placeholder="11999999999"
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                    />
                                    <button
                                      type="button"
                                      disabled={!newPhoneInput.trim() || savingNewPhone}
                                      onClick={async () => {
                                        if (!newPhoneInput.trim()) return;
                                        setSavingNewPhone(true);
                                        try {
                                          const res = await fetch("/api/user/profile", {
                                            method: "PATCH",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ phone: newPhoneInput }),
                                          });
                                          if (res.ok) {
                                            setProfilePhone(newPhoneInput);
                                            setProfilePhoneVerified(false);
                                            setShowPhoneVerificationModal(true);
                                          } else {
                                            setToast({ message: "Erro ao salvar telefone", type: "error" });
                                          }
                                        } catch {
                                          setToast({ message: "Erro ao salvar telefone", type: "error" });
                                        } finally {
                                          setSavingNewPhone(false);
                                        }
                                      }}
                                      className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {savingNewPhone ? "Salvando..." : "Salvar"}
                                    </button>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">Digite apenas números (DDD + número)</p>
                                </div>
                              )}
                            </div>

                            <div className="p-3 bg-white rounded-lg border border-gray-200">
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-teal-700" />
                                <p className="font-medium text-gray-900">E-mail</p>
                              </div>

                              {profileEmail ? (
                                <div className="mt-2">
                                  <p className="text-sm text-gray-700">{profileEmail}</p>
                                  <p className="text-xs text-amber-600 mt-1">Não verificado</p>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        const r = await fetch("/api/auth/resend-verification", {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ email: profileEmail }),
                                        });
                                        if (r.ok) {
                                          setToast({ message: "Enviamos um link de verificação para seu e-mail.", type: "success" });
                                        } else {
                                          setToast({ message: "Não foi possível reenviar a verificação agora.", type: "error" });
                                        }
                                      } catch {
                                        setToast({ message: "Não foi possível reenviar a verificação agora.", type: "error" });
                                      }
                                    }}
                                    className="mt-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
                                  >
                                    Reenviar verificação →
                                  </button>
                                </div>
                              ) : (
                                <div className="mt-2">
                                  <p className="text-sm text-gray-500">Você não tem e-mail cadastrado.</p>
                                  <div className="mt-2 flex gap-2">
                                    <input
                                      type="email"
                                      value={newEmailInput}
                                      onChange={(e) => setNewEmailInput(e.target.value)}
                                      placeholder="seuemail@exemplo.com"
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                    />
                                    <button
                                      type="button"
                                      disabled={!newEmailInput.trim() || savingNewEmail}
                                      onClick={async () => {
                                        if (!newEmailInput.trim()) return;
                                        setSavingNewEmail(true);
                                        try {
                                          const res = await fetch("/api/user/profile", {
                                            method: "PATCH",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ email: newEmailInput.trim() }),
                                          });
                                          const j = await res.json().catch(() => null);
                                          if (res.ok && j?.success && j.user) {
                                            setProfileEmail(j.user.email || newEmailInput.trim());
                                            setProfileEmailVerified(!!j.user.emailVerified);
                                            setEmailConfirmedForListing(false);
                                            setEmailMode("existing");
                                            setToast({ message: "Enviamos um link de verificação para o seu e-mail.", type: "success" });
                                          } else {
                                            setToast({ message: j?.error || "Erro ao salvar e-mail", type: "error" });
                                          }
                                        } catch {
                                          setToast({ message: "Erro ao salvar e-mail", type: "error" });
                                        } finally {
                                          setSavingNewEmail(false);
                                        }
                                      }}
                                      className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {savingNewEmail ? "Salvando..." : "Salvar"}
                                    </button>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">Você precisará clicar no link enviado para confirmar.</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-gray-500">
                            Depois de verificar, volte aqui e atualize a página (ou aguarde alguns segundos) para liberar a publicação.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Navegação desktop */}
              <div className="hidden sm:flex justify-between items-center pt-4 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold shadow border border-emerald-500 text-emerald-700 bg-white hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Voltar
                </button>

                {currentStep < 6 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-5 py-2.5 rounded-lg glass-teal text-sm font-semibold text-white shadow"
                  >
                    {isGeocoding && currentStep === 1 ? "Validando..." : "Avançar"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (isSubmitting) return;
                      setSubmitIntent(true);
                      void handleSubmit({ preventDefault: () => {} } as any);
                    }}
                    disabled={isSubmitting || images.some((i) => i.pending)}
                    className="px-5 py-2.5 rounded-lg glass-teal text-sm font-semibold text-white shadow disabled:opacity-70"
                  >
                    {isSubmitting ? "Publicando..." : images.some((i) => i.pending) ? "Aguardando imagens" : "Publicar anúncio"}
                  </button>
                )}
              </div>
            </form>
          </div>

          <aside className="hidden lg:block lg:col-span-1 sticky top-6 self-start space-y-4">
            {/* Score de qualidade do anúncio */}
            {false && (
              <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Qualidade do anúncio</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    adQualityScore.level === 'excellent' ? 'bg-green-100 text-green-700' :
                    adQualityScore.level === 'good' ? 'bg-blue-100 text-blue-700' :
                    adQualityScore.level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {adQualityScore.score}%
                  </span>
                </div>
                
                {/* Barra de progresso */}
                <div className="h-2 rounded-full bg-gray-200 mb-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      adQualityScore.level === 'excellent' ? 'bg-gradient-to-r from-green-400 to-green-500' :
                      adQualityScore.level === 'good' ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                      adQualityScore.level === 'medium' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                      'bg-gradient-to-r from-red-400 to-red-500'
                    }`}
                    style={{ width: `${adQualityScore.score}%` }}
                  />
                </div>
                
                {/* Checklist resumido */}
                <div className="space-y-1.5 text-xs">
                  {adQualityScore.items.slice(0, 5).map((item, idx) => (
                    <div key={idx} className={`flex items-center gap-2 ${item.done ? 'text-gray-700' : 'text-gray-400'}`}>
                      {item.done ? (
                        <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        </svg>
                      )}
                      <span className={item.done ? '' : 'line-through'}>{item.label}</span>
                    </div>
                  ))}
                </div>
                
                {adQualityScore.score < 60 && (
                  <p className="mt-3 text-[11px] text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5">
                    💡 Complete mais campos para aumentar a visibilidade do seu anúncio
                  </p>
                )}
              </div>
            )}

            {/* Preview do card */}
            <PropertyCardPremium
              property={{
                id: 'preview',
                title: finalTitle,
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
                videoUrl: videoUrl || null,
              }}
              watermark={showWatermark}
            />
            {/* Contextual tips panel (modern glass/gradient) */}
            <div className="mt-4">
              <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-teal/25 to-teal-dark/25">
                <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-white/40 shadow-sm">
                  <div className="flex items-center justify-between px-4 pt-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-r from-teal/10 to-teal-dark/10 text-teal">
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
                      <span className="w-10 h-5 rounded-full bg-gray-300 peer-checked:bg-teal relative transition-colors">
                        <span className="absolute top-1/2 -translate-y-1/2 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-all peer-checked:left-[1.375rem]"></span>
                      </span>
                    </label>
                  </div>
                  {showTips ? (
                    <ul className="px-4 pb-4 pt-3 text-[13px] text-gray-800 space-y-2">
                      {tipsForStep(currentStep).map((t, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-teal/15 to-teal-dark/15 text-teal">
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
      )}

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

      {/* Modal de verificação de telefone */}
      <PhoneVerificationModal
        isOpen={showPhoneVerificationModal}
        onClose={() => setShowPhoneVerificationModal(false)}
        onVerified={() => {
          setProfilePhoneVerified(true);
          setPhoneConfirmedForListing(true);
          setToast({ message: "Telefone verificado! Agora você pode publicar seu anúncio.", type: "success" });
        }}
        phone={profilePhone || ""}
        allowEdit={true}
        onPhoneChange={(newPhone) => {
          setProfilePhone(newPhone);
          setProfilePhoneVerified(false);
        }}
      />
    </DashboardLayout>
  );
}