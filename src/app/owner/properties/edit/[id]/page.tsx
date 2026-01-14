"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Upload, X, GripVertical } from "lucide-react";

type RouteParams = {
  id: string;
};

interface ImageInput {
  id?: string;
  url: string;
  alt?: string;
  sortOrder?: number;
}

const CONDITION_TAG_OPTIONS = [
  "Novo / recém-entregue",
  "Reformado",
  "Bem conservado",
  "Precisa de reforma",
  "Oportunidade",
];

function formatBRLInput(raw: string) {
  const digits = raw.replace(/\D+/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseBRLToNumber(input: string) {
  if (!input) return 0;
  const digits = input.replace(/\D+/g, "");
  const n = Number(digits);
  return Number.isNaN(n) ? 0 : n;
}

function formatCentsToBRL(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  const reais = Math.round(value / 100);
  return formatBRLInput(String(reais));
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
      // Não bloquear upload por questões técnicas
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

    // Se ainda ficar grande, seguimos mesmo assim
    return processed;
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function EditPropertyPage() {
  const params = useParams<RouteParams>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiGenerateWarning, setAiGenerateWarning] = useState<string | null>(null);
  
  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [type, setType] = useState("HOUSE");
  const [status, setStatus] = useState("ACTIVE");
  const [street, setStreet] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [areaM2, setAreaM2] = useState("");
  const [builtAreaM2, setBuiltAreaM2] = useState("");
  const [lotAreaM2, setLotAreaM2] = useState("");
  const [privateAreaM2, setPrivateAreaM2] = useState("");
  const [usableAreaM2, setUsableAreaM2] = useState("");
  const [suites, setSuites] = useState("");
  const [parkingSpots, setParkingSpots] = useState("");
  const [floor, setFloor] = useState("");
  const [totalFloors, setTotalFloors] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [yearRenovated, setYearRenovated] = useState("");
  const [purpose, setPurpose] = useState<"SALE" | "RENT" | "">("");
  const [condoFeeBRL, setCondoFeeBRL] = useState("");
  const [iptuYearlyBRL, setIptuYearlyBRL] = useState("");
  const [furnished, setFurnished] = useState(false);
  const [petFriendly, setPetFriendly] = useState(false);
  const [hasBalcony, setHasBalcony] = useState(false);
  const [hasElevator, setHasElevator] = useState(false);
  const [hasPool, setHasPool] = useState(false);
  const [hasGym, setHasGym] = useState(false);
  const [hasPlayground, setHasPlayground] = useState(false);
  const [hasPartyRoom, setHasPartyRoom] = useState(false);
  const [hasGourmet, setHasGourmet] = useState(false);
  const [hasConcierge24h, setHasConcierge24h] = useState(false);
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
  const [finishFloor, setFinishFloor] = useState("");
  const [finishCabinets, setFinishCabinets] = useState(false);
  const [finishCounterGranite, setFinishCounterGranite] = useState(false);
  const [finishCounterQuartz, setFinishCounterQuartz] = useState(false);
  const [viewSea, setViewSea] = useState(false);
  const [viewCity, setViewCity] = useState(false);
  const [positionFront, setPositionFront] = useState(false);
  const [positionBack, setPositionBack] = useState(false);
  const [sunByRoomNote, setSunByRoomNote] = useState("");
  const [petsSmall, setPetsSmall] = useState(false);
  const [petsLarge, setPetsLarge] = useState(false);
  const [condoRules, setCondoRules] = useState("");
  const [sunOrientation, setSunOrientation] = useState("");
  const [conditionTags, setConditionTags] = useState<string[]>([]);
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
  const [hidePrice, setHidePrice] = useState(false);
  const [hideExactAddress, setHideExactAddress] = useState(false);
  const [hideOwnerContact, setHideOwnerContact] = useState(false);
  const [hideCondoFee, setHideCondoFee] = useState(false);
  const [hideIPTU, setHideIPTU] = useState(false);
  const [images, setImages] = useState<ImageInput[]>([]);

  useEffect(() => {
    if (params?.id) {
      fetchProperty();
    }
  }, [params?.id]);

  const fetchProperty = async () => {
    try {
      const response = await fetch(`/api/owner/properties/${params.id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      
      const data = await response.json();
      if (data.success && data.property) {
        const p = data.property;
        setTitle(p.title);
        setDescription(p.description || "");
        setPrice(String(p.price / 100));
        setType(p.type);
        setStatus(p.status);
        setPurpose(p.purpose || "");
        setStreet(p.street);
        setNeighborhood(p.neighborhood || "");
        setCity(p.city);
        setState(p.state);
        setPostalCode(p.postalCode || "");
        setBedrooms(p.bedrooms !== null && p.bedrooms !== undefined ? String(p.bedrooms) : "");
        setBathrooms(p.bathrooms !== null && p.bathrooms !== undefined ? String(p.bathrooms) : "");
        setAreaM2(p.areaM2 !== null && p.areaM2 !== undefined ? String(p.areaM2) : "");
        setBuiltAreaM2(p.builtAreaM2 !== null && p.builtAreaM2 !== undefined ? String(p.builtAreaM2) : "");
        setLotAreaM2(p.lotAreaM2 !== null && p.lotAreaM2 !== undefined ? String(p.lotAreaM2) : "");
        setPrivateAreaM2(p.privateAreaM2 !== null && p.privateAreaM2 !== undefined ? String(p.privateAreaM2) : "");
        setUsableAreaM2(p.usableAreaM2 !== null && p.usableAreaM2 !== undefined ? String(p.usableAreaM2) : "");
        setSuites(p.suites !== null && p.suites !== undefined ? String(p.suites) : "");
        setParkingSpots(p.parkingSpots !== null && p.parkingSpots !== undefined ? String(p.parkingSpots) : "");
        setFloor(p.floor !== null && p.floor !== undefined ? String(p.floor) : "");
        setTotalFloors(p.totalFloors !== null && p.totalFloors !== undefined ? String(p.totalFloors) : "");
        setYearBuilt(p.yearBuilt !== null && p.yearBuilt !== undefined ? String(p.yearBuilt) : "");
        setYearRenovated(p.yearRenovated !== null && p.yearRenovated !== undefined ? String(p.yearRenovated) : "");
        setCondoFeeBRL(formatCentsToBRL(p.condoFee ?? null));
        setIptuYearlyBRL(formatCentsToBRL(p.iptuYearly ?? null));
        setFurnished(!!p.furnished);
        setPetFriendly(!!p.petFriendly);
        setHasBalcony(!!p.hasBalcony);
        setHasElevator(!!p.hasElevator);
        setHasPool(!!p.hasPool);
        setHasGym(!!p.hasGym);
        setHasPlayground(!!p.hasPlayground);
        setHasPartyRoom(!!p.hasPartyRoom);
        setHasGourmet(!!p.hasGourmet);
        setHasConcierge24h(!!p.hasConcierge24h);
        setAccRamps(!!p.accRamps);
        setAccWideDoors(!!p.accWideDoors);
        setAccAccessibleElevator(!!p.accAccessibleElevator);
        setAccTactile(!!p.accTactile);
        setComfortAC(!!p.comfortAC);
        setComfortHeating(!!p.comfortHeating);
        setComfortSolar(!!p.comfortSolar);
        setComfortNoiseWindows(!!p.comfortNoiseWindows);
        setComfortLED(!!p.comfortLED);
        setComfortWaterReuse(!!p.comfortWaterReuse);
        setFinishFloor(p.finishFloor || "");
        setFinishCabinets(!!p.finishCabinets);
        setFinishCounterGranite(!!p.finishCounterGranite);
        setFinishCounterQuartz(!!p.finishCounterQuartz);
        setViewSea(!!p.viewSea);
        setViewCity(!!p.viewCity);
        setPositionFront(!!p.positionFront);
        setPositionBack(!!p.positionBack);
        setSunByRoomNote(p.sunByRoomNote || "");
        setPetsSmall(!!p.petsSmall);
        setPetsLarge(!!p.petsLarge);
        setCondoRules(p.condoRules || "");
        setSunOrientation(p.sunOrientation || "");
        setConditionTags(Array.isArray(p.conditionTags) ? p.conditionTags : []);
        setPrivateOwnerName(p.privateOwnerName || "");
        setPrivateOwnerPhone(p.privateOwnerPhone || "");
        setPrivateOwnerEmail(p.privateOwnerEmail || "");
        setPrivateOwnerAddress(p.privateOwnerAddress || "");
        setPrivateOwnerPriceBRL(formatCentsToBRL(p.privateOwnerPrice ?? null));
        setPrivateBrokerFeePercent(
          p.privateBrokerFeePercent !== null && p.privateBrokerFeePercent !== undefined
            ? String(p.privateBrokerFeePercent).replace(".", ",")
            : ""
        );
        setPrivateBrokerFeeFixedBRL(formatCentsToBRL(p.privateBrokerFeeFixed ?? null));
        setPrivateExclusive(!!p.privateExclusive);
        setPrivateExclusiveUntil(
          p.privateExclusiveUntil ? new Date(p.privateExclusiveUntil).toISOString().slice(0, 10) : ""
        );
        setPrivateOccupied(!!p.privateOccupied);
        setPrivateOccupantInfo(p.privateOccupantInfo || "");
        setPrivateKeyLocation(p.privateKeyLocation || "");
        setPrivateNotes(p.privateNotes || "");
        setHidePrice(!!p.hidePrice);
        setHideExactAddress(!!p.hideExactAddress);
        setHideOwnerContact(!!p.hideOwnerContact);
        setHideCondoFee(!!p.hideCondoFee);
        setHideIPTU(!!p.hideIPTU);
        setImages(p.images || []);
      }
    } catch (error) {
      console.error("Error fetching property:", error);
      alert("Erro ao carregar imóvel");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/owner/properties/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          price: Math.round(parseFloat(price) * 100),
          type,
          status,
          purpose: purpose || null,
          street,
          neighborhood,
          city,
          state,
          postalCode,
          bedrooms: bedrooms ? parseInt(bedrooms) : null,
          bathrooms: bathrooms ? parseFloat(bathrooms) : null,
          areaM2: areaM2 ? parseInt(areaM2) : null,
          builtAreaM2: builtAreaM2 ? parseInt(builtAreaM2) : null,
          lotAreaM2: lotAreaM2 ? parseInt(lotAreaM2) : null,
          privateAreaM2: privateAreaM2 ? parseInt(privateAreaM2) : null,
          usableAreaM2: usableAreaM2 ? parseInt(usableAreaM2) : null,
          suites: suites ? parseInt(suites) : null,
          parkingSpots: parkingSpots ? parseInt(parkingSpots) : null,
          floor: floor ? parseInt(floor) : null,
          totalFloors: totalFloors ? parseInt(totalFloors) : null,
          yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
          yearRenovated: yearRenovated ? parseInt(yearRenovated) : null,
          furnished,
          petFriendly,
          condoFee: condoFeeBRL ? parseBRLToNumber(condoFeeBRL) * 100 : null,
          iptuYearly: iptuYearlyBRL ? parseBRLToNumber(iptuYearlyBRL) * 100 : null,
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
          finishFloor: finishFloor || null,
          finishCabinets,
          finishCounterGranite,
          finishCounterQuartz,
          viewSea,
          viewCity,
          positionFront,
          positionBack,
          sunByRoomNote: sunByRoomNote || null,
          petsSmall,
          petsLarge,
          condoRules: condoRules || null,
          sunOrientation: sunOrientation || null,
          conditionTags,
          privateOwnerName: privateOwnerName || null,
          privateOwnerPhone: privateOwnerPhone || null,
          privateOwnerEmail: privateOwnerEmail || null,
          privateOwnerAddress: privateOwnerAddress || null,
          privateOwnerPrice: privateOwnerPriceBRL ? parseBRLToNumber(privateOwnerPriceBRL) * 100 : null,
          privateBrokerFeePercent: privateBrokerFeePercent
            ? parseFloat(privateBrokerFeePercent.replace(",", "."))
            : null,
          privateBrokerFeeFixed: privateBrokerFeeFixedBRL
            ? parseBRLToNumber(privateBrokerFeeFixedBRL) * 100
            : null,
          privateExclusive,
          privateExclusiveUntil: privateExclusiveUntil || null,
          privateOccupied,
          privateOccupantInfo: privateOccupantInfo || null,
          privateKeyLocation: privateKeyLocation || null,
          privateNotes: privateNotes || null,
          hidePrice,
          hideExactAddress,
          hideOwnerContact,
          hideCondoFee,
          hideIPTU,
          images,
        }),
      });

      if (response.ok) {
        alert("Imóvel atualizado com sucesso!");
        router.push("/owner/properties");
      } else {
        alert("Erro ao atualizar imóvel");
      }
    } catch (error) {
      console.error("Error saving:", error);
      alert("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      const processedFile = await preprocessImageForUpload(file);
      // Get signature
      const sigRes = await fetch("/api/upload/cloudinary-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "zillowlike" }),
      });
      if (!sigRes.ok) throw new Error("Failed to sign");
      const sig = await sigRes.json();

      // Upload to Cloudinary
      const fd = new FormData();
      fd.append("file", processedFile);
      fd.append("api_key", sig.apiKey);
      fd.append("timestamp", String(sig.timestamp));
      fd.append("signature", sig.signature);
      fd.append("folder", sig.folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
        { method: "POST", body: fd }
      );
      const data = await uploadRes.json();

      if (data.secure_url) {
        setImages(prev => [...prev, { url: data.secure_url, sortOrder: prev.length }]);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert((error as any)?.message || "Erro no upload");
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateWithAi = async () => {
    if (isGeneratingAi) return;

    const readyImages = (images || [])
      .filter((i) => i?.url)
      .map((i) => String(i.url))
      .slice(0, 10);

    if (readyImages.length === 0) {
      alert("Adicione ao menos 1 foto antes de gerar a descrição.");
      return;
    }

    setIsGeneratingAi(true);
    setAiGenerateWarning(null);
    try {
      const res = await fetch("/api/ai/property-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title ? title : null,
          type,
          purpose: purpose || null,
          priceBRL: price ? Math.round(Number(price)) : null,
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
        alert(json?.error || "Limite atingido. Tente novamente mais tarde.");
        return;
      }
      if (!res.ok) {
        alert(json?.error || "Falha ao gerar texto com IA");
        return;
      }

      const nextTitle = (json?.data?.title as string | undefined) || "";
      const text = (json?.data?.description as string | undefined) || "";
      const warning = json?.data?._aiWarning;

      if (warning || !text.trim()) {
        setAiGenerateWarning(
          "A OpenAI está passando por dificuldades técnicas no momento. Por favor, preencha o título e o texto do anúncio manualmente e tente novamente mais tarde."
        );
      }

      if (nextTitle.trim()) setTitle(nextTitle);
      if (text.trim()) setDescription(text);
    } catch {
      setAiGenerateWarning(
        "A OpenAI está passando por dificuldades técnicas no momento. Por favor, preencha o título e o texto do anúncio manualmente e tente novamente mais tarde."
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/owner/properties"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </Link>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 glass-teal hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
          >
            <Save className="w-5 h-5" />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar Imóvel</h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título *
                  </label>
                  <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setAiGenerateWarning(null);
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                    <button
                      type="button"
                      onClick={handleGenerateWithAi}
                      disabled={isGeneratingAi}
                      className="whitespace-nowrap px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold"
                    >
                      {isGeneratingAi ? "Gerando..." : "Gerar com IA"}
                    </button>
                  </div>
                  {aiGenerateWarning && (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      {aiGenerateWarning}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preço (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo *
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      Status *
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="ACTIVE">Ativo</option>
                      <option value="PAUSED">Pausado</option>
                      <option value="DRAFT">Rascunho</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Finalidade
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value as any)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione</option>
                    <option value="SALE">Venda</option>
                    <option value="RENT">Aluguel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </section>

            {/* Location */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Localização</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rua *
                    </label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cidade *
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado *
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CEP
                    </label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Details */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalhes</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quartos
                  </label>
                  <input
                    type="number"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Banheiros
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Área (m²)
                  </label>
                  <input
                    type="number"
                    value={areaM2}
                    onChange={(e) => setAreaM2(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Área construída (m²)
                  </label>
                  <input
                    type="number"
                    value={builtAreaM2}
                    onChange={(e) => setBuiltAreaM2(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Área do terreno (m²)
                  </label>
                  <input
                    type="number"
                    value={lotAreaM2}
                    onChange={(e) => setLotAreaM2(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Área privativa (m²)
                  </label>
                  <input
                    type="number"
                    value={privateAreaM2}
                    onChange={(e) => setPrivateAreaM2(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Área útil (m²)
                  </label>
                  <input
                    type="number"
                    value={usableAreaM2}
                    onChange={(e) => setUsableAreaM2(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Suítes
                  </label>
                  <input
                    type="number"
                    value={suites}
                    onChange={(e) => setSuites(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vagas de garagem
                  </label>
                  <input
                    type="number"
                    value={parkingSpots}
                    onChange={(e) => setParkingSpots(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Andar
                  </label>
                  <input
                    type="number"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Andares do prédio
                  </label>
                  <input
                    type="number"
                    value={totalFloors}
                    onChange={(e) => setTotalFloors(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ano de construção
                  </label>
                  <input
                    type="number"
                    value={yearBuilt}
                    onChange={(e) => setYearBuilt(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ano de reforma
                  </label>
                  <input
                    type="number"
                    value={yearRenovated}
                    onChange={(e) => setYearRenovated(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Condomínio (R$/mês)
                  </label>
                  <input
                    type="text"
                    value={condoFeeBRL}
                    onChange={(e) => setCondoFeeBRL(formatBRLInput(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IPTU (R$/ano)
                  </label>
                  <input
                    type="text"
                    value={iptuYearlyBRL}
                    onChange={(e) => setIptuYearlyBRL(formatBRLInput(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </section>

            {/* Amenities & Condomínio */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Amenidades e Condomínio</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={furnished}
                      onChange={(e) => setFurnished(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Mobiliado</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={petFriendly}
                      onChange={(e) => setPetFriendly(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Aceita pets</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={hasBalcony}
                      onChange={(e) => setHasBalcony(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Varanda</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={hasElevator}
                      onChange={(e) => setHasElevator(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Elevador</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={hasPool}
                      onChange={(e) => setHasPool(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Piscina</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={hasGym}
                      onChange={(e) => setHasGym(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Academia</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={hasPlayground}
                      onChange={(e) => setHasPlayground(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Playground</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={hasPartyRoom}
                      onChange={(e) => setHasPartyRoom(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Salão de festas</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={hasGourmet}
                      onChange={(e) => setHasGourmet(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Espaço gourmet</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={hasConcierge24h}
                      onChange={(e) => setHasConcierge24h(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Portaria 24h</span>
                  </label>
                </div>
              </div>
            </section>

            {/* Comfort / Finishes / View / Accessibility / Pets */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Conforto, Acabamentos e Outras Informações</h2>
              <div className="space-y-6">
                {/* Conforto / energia */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Conforto e energia</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={comfortAC}
                        onChange={(e) => setComfortAC(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Ar-condicionado</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={comfortHeating}
                        onChange={(e) => setComfortHeating(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Aquecimento</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={comfortSolar}
                        onChange={(e) => setComfortSolar(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Energia solar</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={comfortNoiseWindows}
                        onChange={(e) => setComfortNoiseWindows(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Janelas anti-ruído</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={comfortLED}
                        onChange={(e) => setComfortLED(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Iluminação LED</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={comfortWaterReuse}
                        onChange={(e) => setComfortWaterReuse(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Reúso de água</span>
                    </label>
                  </div>
                </div>

                {/* Acabamentos */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Acabamentos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Piso principal
                      </label>
                      <select
                        value={finishFloor}
                        onChange={(e) => setFinishFloor(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Selecione</option>
                        <option value="PORCELANATO">Porcelanato</option>
                        <option value="MADEIRA">Madeira</option>
                        <option value="VINILICO">Vinílico</option>
                        <option value="OUTRO">Outro</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={finishCabinets}
                          onChange={(e) => setFinishCabinets(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Armários planejados</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={finishCounterGranite}
                          onChange={(e) => setFinishCounterGranite(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Bancada granito</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={finishCounterQuartz}
                          onChange={(e) => setFinishCounterQuartz(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Bancada quartzo</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Vista / posição */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Vista e posição</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={viewSea}
                        onChange={(e) => setViewSea(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Vista para o mar</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={viewCity}
                        onChange={(e) => setViewCity(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Vista para a cidade</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={positionFront}
                        onChange={(e) => setPositionFront(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>De frente (voltado para a rua)</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={positionBack}
                        onChange={(e) => setPositionBack(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Fundos (mais silencioso)</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Orientação do sol
                      </label>
                      <select
                        value={sunOrientation}
                        onChange={(e) => setSunOrientation(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Selecione</option>
                        <option value="NASCENTE">Nascente (sol da manhã)</option>
                        <option value="POENTE">Poente (sol da tarde)</option>
                        <option value="OUTRA">Outra</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Observações sobre sol por cômodo
                      </label>
                      <textarea
                        value={sunByRoomNote}
                        onChange={(e) => setSunByRoomNote(e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: Sol da manhã nos quartos, sol da tarde na sala"
                      />
                    </div>
                  </div>
                </div>

                {/* Acessibilidade */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Acessibilidade</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={accRamps}
                        onChange={(e) => setAccRamps(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Rampas de acesso</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={accWideDoors}
                        onChange={(e) => setAccWideDoors(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Portas largas</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={accAccessibleElevator}
                        onChange={(e) => setAccAccessibleElevator(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Elevador acessível</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={accTactile}
                        onChange={(e) => setAccTactile(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Piso tátil</span>
                    </label>
                  </div>
                </div>

                {/* Pets / regras */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Pets e regras</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={petsSmall}
                        onChange={(e) => setPetsSmall(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Aceita pets pequenos</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={petsLarge}
                        onChange={(e) => setPetsLarge(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Aceita pets grandes</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Regras do condomínio (breve)
                    </label>
                    <input
                      type="text"
                      value={condoRules}
                      onChange={(e) => setCondoRules(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: Horário para uso de áreas comuns, regras para pets, etc."
                    />
                  </div>
                </div>

                {/* Tags de condição */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Estado do imóvel</h3>
                  <div className="flex flex-wrap gap-2">
                    {CONDITION_TAG_OPTIONS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setConditionTags((prev) =>
                            prev.includes(tag)
                              ? prev.filter((t) => t !== tag)
                              : [...prev, tag]
                          )
                        }
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          conditionTags.includes(tag)
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Private owner data */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados do proprietário (internos)</h2>
              <p className="text-sm text-gray-600 mb-4">
                Essas informações são apenas para o seu controle e <strong>não aparecem no anúncio público</strong>.
              </p>

              <div className="space-y-6">
                {/* Contato do proprietário */}
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-4">
                  <h3 className="font-medium text-gray-900">Contato do proprietário</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome do proprietário
                      </label>
                      <input
                        type="text"
                        value={privateOwnerName}
                        onChange={(e) => setPrivateOwnerName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefone do proprietário
                      </label>
                      <input
                        type="text"
                        value={privateOwnerPhone}
                        onChange={(e) => setPrivateOwnerPhone(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        E-mail do proprietário
                      </label>
                      <input
                        type="email"
                        value={privateOwnerEmail}
                        onChange={(e) => setPrivateOwnerEmail(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Endereço do proprietário
                      </label>
                      <input
                        type="text"
                        value={privateOwnerAddress}
                        onChange={(e) => setPrivateOwnerAddress(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Valores e comissão */}
                <div className="p-4 bg-green-50 border border-green-100 rounded-xl space-y-4">
                  <h3 className="font-medium text-gray-900">Valores e comissão</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor desejado pelo proprietário (R$)
                      </label>
                      <input
                        type="text"
                        value={privateOwnerPriceBRL}
                        onChange={(e) => setPrivateOwnerPriceBRL(formatBRLInput(e.target.value))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Taxa de corretagem (%)
                      </label>
                      <input
                        type="text"
                        value={privateBrokerFeePercent}
                        onChange={(e) =>
                          setPrivateBrokerFeePercent(e.target.value.replace(/[^0-9.,]/g, ""))
                        }
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ou taxa fixa (R$)
                      </label>
                      <input
                        type="text"
                        value={privateBrokerFeeFixedBRL}
                        onChange={(e) => setPrivateBrokerFeeFixedBRL(formatBRLInput(e.target.value))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Exclusividade */}
                <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl space-y-4">
                  <h3 className="font-medium text-gray-900">Exclusividade</h3>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={privateExclusive}
                      onChange={(e) => setPrivateExclusive(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Imóvel exclusivo (só você pode vender)</span>
                  </label>
                  {privateExclusive && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Exclusividade até
                      </label>
                      <input
                        type="date"
                        value={privateExclusiveUntil}
                        onChange={(e) => setPrivateExclusiveUntil(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

                {/* Situação do imóvel / chaves / notas */}
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-4">
                  <h3 className="font-medium text-gray-900">Situação do imóvel</h3>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={privateOccupied}
                      onChange={(e) => setPrivateOccupied(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Imóvel está ocupado</span>
                  </label>
                  {privateOccupied && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quem mora / informações do contrato
                      </label>
                      <input
                        type="text"
                        value={privateOccupantInfo}
                        onChange={(e) => setPrivateOccupantInfo(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Onde está a chave
                    </label>
                    <input
                      type="text"
                      value={privateKeyLocation}
                      onChange={(e) => setPrivateKeyLocation(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Observações internas
                    </label>
                    <textarea
                      value={privateNotes}
                      onChange={(e) => setPrivateNotes(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Anotações particulares sobre este imóvel ou negociação..."
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Visibility */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Privacidade do anúncio</h2>
              <p className="text-sm text-gray-600 mb-4">
                Escolha quais informações devem ficar ocultas no anúncio público. Interessados precisarão entrar em contato
                para saber esses detalhes.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={hidePrice}
                      onChange={(e) => setHidePrice(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Ocultar preço (mostrar "Consulte")</span>
                  </label>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={hideExactAddress}
                      onChange={(e) => setHideExactAddress(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Ocultar endereço exato (mostrar só bairro)</span>
                  </label>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={hideOwnerContact}
                      onChange={(e) => setHideOwnerContact(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Ocultar WhatsApp/telefone do anúncio (somente chat)</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Se desmarcado, o WhatsApp fica disponível apenas para usuários logados e com e-mail verificado.
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={hideCondoFee}
                      onChange={(e) => setHideCondoFee(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Ocultar taxa de condomínio</span>
                  </label>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={hideIPTU}
                      onChange={(e) => setHideIPTU(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Ocultar IPTU</span>
                  </label>
                </div>
              </div>
            </section>

            {/* Images */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Fotos</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={img.url}
                      alt={img.alt || ""}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Adicionar foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                </label>
              </div>
            </section>
          </form>
        </div>
      </div>
    </div>
  );
}
