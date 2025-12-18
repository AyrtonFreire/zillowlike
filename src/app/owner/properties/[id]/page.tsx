"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Edit2,
  Eye,
  Home,
  MapPin,
  Bed,
  Bath,
  Maximize,
  Calendar,
  DollarSign,
  User,
  Phone,
  Mail,
  Key,
  Lock,
  FileText,
  Users,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Copy,
  Share2,
  Upload,
  Trash2,
  Download,
  File,
  Globe,
  LockKeyhole,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { buildPropertyPath } from "@/lib/slug";
import DashboardLayout from "@/components/DashboardLayout";

type Tab = "resumo" | "caracteristicas" | "leads" | "documentos" | "privado";

interface PropertyData {
  id: string;
  title: string;
  description: string;
  price: number;
  type: string;
  purpose: string | null;
  status: string;
  street: string;
  neighborhood: string | null;
  city: string;
  state: string;
  postalCode: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaM2: number | null;
  suites: number | null;
  parkingSpots: number | null;
  floor: number | null;
  yearBuilt: number | null;
  conditionTags: string[];
  images: { id: string; url: string; alt?: string }[];
  createdAt: string;
  updatedAt: string;
  // Amenidades
  hasBalcony: boolean | null;
  hasElevator: boolean | null;
  hasPool: boolean | null;
  hasGym: boolean | null;
  hasPlayground: boolean | null;
  hasPartyRoom: boolean | null;
  hasGourmet: boolean | null;
  hasConcierge24h: boolean | null;
  // Dados privados
  privateOwnerName: string | null;
  privateOwnerPhone: string | null;
  privateOwnerEmail: string | null;
  privateOwnerAddress: string | null;
  privateOwnerPrice: number | null;
  privateBrokerFeePercent: number | null;
  privateBrokerFeeFixed: number | null;
  privateExclusive: boolean | null;
  privateExclusiveUntil: string | null;
  privateOccupied: boolean | null;
  privateOccupantInfo: string | null;
  privateKeyLocation: string | null;
  privateNotes: string | null;
  // Stats
  _count?: {
    views: number;
    leads: number;
    favorites: number;
  };
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  createdAt: string;
}

interface PropertyDocument {
  id: string;
  name: string;
  fileName: string;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  category: string;
  isPublic: boolean;
  createdAt: string;
}

const DOCUMENT_CATEGORIES: Record<string, string> = {
  DEED: "Escritura",
  IPTU: "IPTU",
  CONDO: "Condomínio",
  CONTRACT: "Contrato",
  FLOOR_PLAN: "Planta Baixa",
  INSPECTION: "Vistoria",
  PHOTO_360: "Tour 360°",
  OTHER: "Outros",
};

const calculateQualityScore = (property: PropertyData): number => {
  const checks = [
    property.images.length >= 5,
    property.description && property.description.length >= 100,
    property.bedrooms !== null,
    property.bathrooms !== null,
    property.areaM2 !== null,
    property.neighborhood !== null,
  ];
  const score = (checks.filter(Boolean).length / checks.length) * 100;
  return Math.round(score);
};

const getMissingFields = (property: PropertyData): string[] => {
  const missing: string[] = [];
  if (!property.neighborhood) missing.push("Preencher bairro");
  if (!property.bedrooms) missing.push("Adicionar n° de quartos");
  if (!property.bathrooms) missing.push("Adicionar n° de banheiros");
  if (!property.areaM2) missing.push("Informar área em m²");
  return missing;
};

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("resumo");
  const [copied, setCopied] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // Document upload states
  const [showDocForm, setShowDocForm] = useState(false);
  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState("OTHER");
  const [docIsPublic, setDocIsPublic] = useState(false);
  const [docUrl, setDocUrl] = useState("");
  const [docUploading, setDocUploading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  useEffect(() => {
    if (params?.id) {
      fetchProperty();
      fetchLeads();
      fetchDocuments();
    }
  }, [params?.id]);

  const fetchProperty = async () => {
    try {
      const response = await fetch(`/api/owner/properties/${params.id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      if (data.success && data.property) {
        setProperty(data.property);
        setActiveImageIndex(0);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const response = await fetch(`/api/owner/properties/${params.id}/leads`);
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/owner/properties/${params.id}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  const addDocument = async () => {
    if (!docName.trim() || !docUrl.trim()) return;
    
    setDocUploading(true);
    try {
      const response = await fetch(`/api/owner/properties/${params.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: docName,
          fileName: docUrl.split("/").pop() || docName,
          url: docUrl,
          category: docCategory,
          isPublic: docIsPublic,
        }),
      });
      
      if (response.ok) {
        await fetchDocuments();
        setDocName("");
        setDocUrl("");
        setDocCategory("OTHER");
        setDocIsPublic(false);
        setShowDocForm(false);
      }
    } catch (error) {
      console.error("Error adding document:", error);
    } finally {
      setDocUploading(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (deletingDocId === documentId) {
      // Second click - confirm delete
      try {
        const response = await fetch(`/api/owner/properties/${params.id}/documents`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId }),
        });
        
        if (response.ok) {
          await fetchDocuments();
        }
      } catch (error) {
        console.error("Error deleting document:", error);
      } finally {
        setDeletingDocId(null);
      }
    } else {
      // First click - ask for confirmation
      setDeletingDocId(documentId);
      setTimeout(() => setDeletingDocId(null), 3000);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const copyLink = () => {
    const url = `${window.location.origin}/property/${params.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const showPrevImage = () => {
    if (!property || !property.images.length) return;
    setActiveImageIndex((prev) => (prev === 0 ? property.images.length - 1 : prev - 1));
  };

  const showNextImage = () => {
    if (!property || !property.images.length) return;
    setActiveImageIndex((prev) =>
      prev === property.images.length - 1 ? 0 : prev + 1
    );
  };

  const formatPrice = (price: number) => {
    return (price / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "resumo", label: "Resumo", icon: <Home className="w-4 h-4" /> },
    { id: "caracteristicas", label: "Características", icon: <Building2 className="w-4 h-4" /> },
    { id: "leads", label: `Leads (${leads.length})`, icon: <Users className="w-4 h-4" /> },
    { id: "documentos", label: "Documentos", icon: <FileText className="w-4 h-4" /> },
    { id: "privado", label: "Dados Privados", icon: <Lock className="w-4 h-4" /> },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Carregando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!property) {
    return (
      <DashboardLayout title="Imóvel não encontrado">
        <div className="text-center py-12">
          <p className="text-gray-500">Este imóvel não existe ou você não tem permissão para vê-lo.</p>
          <Link href="/owner/properties" className="text-teal-600 hover:underline mt-4 inline-block">
            Voltar para meus imóveis
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const qualityScore = calculateQualityScore(property);
  const missingFields = getMissingFields(property);
  const hasDescriptionQuality = !!(property.description && property.description.length >= 100);
  const hasMinPhotosQuality = property.images.length >= 5;

  let qualityLabel = "Precisa de atenção";
  if (qualityScore >= 80) {
    qualityLabel = "Excelente";
  } else if (qualityScore >= 60) {
    qualityLabel = "Bom, mas pode melhorar";
  }

  return (
    <DashboardLayout
      title={property.title}
      breadcrumbs={[
        { label: "Meus Imóveis", href: "/owner/properties" },
        { label: property.title },
      ]}
    >
      {/* Header com ações */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/owner/properties"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{property.title}</h1>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {property.neighborhood ? `${property.neighborhood}, ` : ""}
                {property.city}/{property.state}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiado!" : "Copiar link"}
            </button>
            <a
              href={buildPropertyPath(property.id, property.title)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Ver anúncio
            </a>
            <Link
              href={`/owner/properties/edit/${property.id}`}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </Link>
          </div>
        </div>
      </div>

      {/* Resumo rápido de desempenho e qualidade */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-600 flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-gray-500" />
            Visualizações
          </p>
          <p className="text-2xl font-bold text-gray-900">{property._count?.views ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-600 flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-gray-500" />
            Leads
          </p>
          <p className="text-2xl font-bold text-gray-900">{property._count?.leads ?? leads.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-600 flex items-center gap-2 mb-1">
            <Home className="w-4 h-4 text-gray-500" />
            Favoritos
          </p>
          <p className="text-2xl font-bold text-gray-900">{property._count?.favorites ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-600 mb-1">Qualidade do anúncio</p>
          <p className="text-xl font-bold text-gray-900 mb-1">{qualityScore}%</p>
          <p className="text-[11px] text-gray-500 mb-2">{qualityLabel}</p>
          {missingFields.length > 0 || !hasDescriptionQuality || !hasMinPhotosQuality ? (
            <ul className="text-[11px] text-yellow-700 space-y-0.5">
              {!hasMinPhotosQuality && <li>• Adicione mais fotos (mínimo 5)</li>}
              {!hasDescriptionQuality && <li>• Escreva uma descrição mais completa</li>}
              {missingFields.slice(0, 2).map((field, idx) => (
                <li key={idx}>• {field}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-green-700">
              Anúncio bem otimizado. Boas chances de atrair interessados.
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1 overflow-x-auto pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-teal-600 text-teal-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* RESUMO */}
        {activeTab === "resumo" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Galeria de fotos */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                {property.images.length > 0 ? (
                  <div className="space-y-3">
                    {/* Imagem principal */}
                    <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={
                          property.images[activeImageIndex]?.url ||
                          property.images[0].url
                        }
                        alt={
                          property.images[activeImageIndex]?.alt ||
                          property.title
                        }
                        fill
                        className="object-cover"
                      />
                      {property.images.length > 1 && (
                        <div className="absolute inset-0 flex items-center justify-between px-2">
                          <button
                            type="button"
                            onClick={showPrevImage}
                            className="inline-flex items-center justify-center rounded-full bg-black/50 text-white p-1.5 hover:bg-black/70 transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={showNextImage}
                            className="inline-flex items-center justify-center rounded-full bg-black/50 text-white p-1.5 hover:bg-black/70 transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {property.images.length > 1 && (
                        <div className="absolute bottom-2 right-3 px-2 py-1 rounded-full bg-black/60 text-white text-xs font-medium">
                          {activeImageIndex + 1} / {property.images.length}
                        </div>
                      )}
                    </div>

                    {/* Miniaturas */}
                    {property.images.length > 1 && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 overflow-x-auto">
                          <div className="flex gap-2">
                            {property.images.slice(0, 12).map((img, idx) => (
                              <button
                                key={img.id}
                                type="button"
                                onClick={() => setActiveImageIndex(idx)}
                                className={`relative w-16 h-16 rounded-md overflow-hidden border flex-shrink-0 ${
                                  idx === activeImageIndex
                                    ? "border-teal-500 ring-2 ring-teal-400"
                                    : "border-gray-200"
                                }`}
                              >
                                <Image
                                  src={img.url}
                                  alt={img.alt || property.title}
                                  fill
                                  className="object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                        {property.images.length > 12 && (
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            +{property.images.length - 12} fotos
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-100 flex items-center justify-center rounded-lg">
                    <Home className="w-12 h-12 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Descrição */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Descrição</h3>
                <p className="text-gray-600 whitespace-pre-wrap">
                  {property.description || "Sem descrição."}
                </p>
              </div>

              {/* Detalhes básicos */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Detalhes</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {property.bedrooms !== null && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Bed className="w-5 h-5 text-teal-600" />
                      <div>
                        <p className="text-sm text-gray-500">Quartos</p>
                        <p className="font-semibold">{property.bedrooms}</p>
                      </div>
                    </div>
                  )}
                  {property.bathrooms !== null && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Bath className="w-5 h-5 text-teal-600" />
                      <div>
                        <p className="text-sm text-gray-500">Banheiros</p>
                        <p className="font-semibold">{property.bathrooms}</p>
                      </div>
                    </div>
                  )}
                  {property.areaM2 !== null && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Maximize className="w-5 h-5 text-teal-600" />
                      <div>
                        <p className="text-sm text-gray-500">Área</p>
                        <p className="font-semibold">{property.areaM2} m²</p>
                      </div>
                    </div>
                  )}
                  {property.parkingSpots !== null && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Home className="w-5 h-5 text-teal-600" />
                      <div>
                        <p className="text-sm text-gray-500">Vagas</p>
                        <p className="font-semibold">{property.parkingSpots}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna lateral */}
            <div className="space-y-6">
              {/* Card de preço e status */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      property.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : property.status === "PAUSED"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {property.status === "ACTIVE" ? "Ativo" : property.status === "PAUSED" ? "Pausado" : "Rascunho"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {property.purpose === "RENT" ? "Aluguel" : "Venda"}
                  </span>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{formatPrice(property.price)}</p>
                {property.purpose === "RENT" && <p className="text-sm text-gray-500">/mês</p>}
              </div>

              {/* Métricas */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Métricas</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Visualizações
                    </span>
                    <span className="font-semibold">{property._count?.views || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Leads
                    </span>
                    <span className="font-semibold">{property._count?.leads || leads.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Home className="w-4 h-4" /> Favoritos
                    </span>
                    <span className="font-semibold">{property._count?.favorites || 0}</span>
                  </div>
                </div>
              </div>

              {/* Datas */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Histórico</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Publicado em</span>
                    <span className="text-gray-900">{formatDate(property.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Atualizado em</span>
                    <span className="text-gray-900">{formatDate(property.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CARACTERÍSTICAS */}
        {activeTab === "caracteristicas" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-6">Todas as características</h3>
            
            {/* Tags de condição */}
            {property.conditionTags?.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {property.conditionTags.map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-teal-50 text-teal-700 text-sm rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Amenidades */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                { label: "Varanda", value: property.hasBalcony },
                { label: "Elevador", value: property.hasElevator },
                { label: "Piscina", value: property.hasPool },
                { label: "Academia", value: property.hasGym },
                { label: "Playground", value: property.hasPlayground },
                { label: "Salão de Festas", value: property.hasPartyRoom },
                { label: "Espaço Gourmet", value: property.hasGourmet },
                { label: "Portaria 24h", value: property.hasConcierge24h },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 p-3 rounded-lg border ${
                    item.value ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                  }`}
                >
                  {item.value ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-400" />
                  )}
                  <span className={item.value ? "text-green-700" : "text-gray-500"}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LEADS */}
        {activeTab === "leads" && (
          <div className="bg-white rounded-xl border border-gray-200">
            {leads.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum lead para este imóvel ainda.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {leads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/owner/leads/${lead.id}`}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{lead.name}</p>
                        <p className="text-sm text-gray-500">{lead.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          lead.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-700"
                            : lead.status === "COMPLETED"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {lead.status === "PENDING" ? "Pendente" : lead.status === "COMPLETED" ? "Concluído" : lead.status}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(lead.createdAt)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DOCUMENTOS */}
        {activeTab === "documentos" && (
          <div className="space-y-6">
            {/* Header com botão adicionar */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Documentos do imóvel</h3>
                <p className="text-sm text-gray-500">Anexe escritura, IPTU, contratos e outros documentos</p>
              </div>
              <button
                onClick={() => setShowDocForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
              >
                <Upload className="w-4 h-4" />
                Adicionar documento
              </button>
            </div>

            {/* Formulário de adição */}
            {showDocForm && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                <h4 className="font-medium text-gray-900 mb-4">Novo documento</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do documento *</label>
                    <input
                      type="text"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      placeholder="Ex: Escritura do imóvel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                    <select
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      {Object.entries(DOCUMENT_CATEGORIES).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL do documento *</label>
                    <input
                      type="url"
                      value={docUrl}
                      onChange={(e) => setDocUrl(e.target.value)}
                      placeholder="https://exemplo.com/documento.pdf"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Cole a URL do arquivo hospedado (Google Drive, Dropbox, etc.)</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={docIsPublic}
                        onChange={(e) => setDocIsPublic(e.target.checked)}
                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">
                        Documento público (clientes interessados podem ver)
                      </span>
                    </label>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowDocForm(false);
                      setDocName("");
                      setDocUrl("");
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={addDocument}
                    disabled={!docName.trim() || !docUrl.trim() || docUploading}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {docUploading ? "Salvando..." : "Salvar documento"}
                  </button>
                </div>
              </div>
            )}

            {/* Lista de documentos */}
            {documents.length === 0 && !showDocForm ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">Nenhum documento anexado</p>
                <p className="text-sm text-gray-400">
                  Clique em &quot;Adicionar documento&quot; para começar
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <File className="w-6 h-6 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 truncate">{doc.name}</h4>
                          {doc.isPublic ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                              <Globe className="w-3 h-3" /> Público
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              <LockKeyhole className="w-3 h-3" /> Privado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                            {DOCUMENT_CATEGORIES[doc.category] || doc.category}
                          </span>
                          {doc.sizeBytes && <span>{formatFileSize(doc.sizeBytes)}</span>}
                          <span>{formatDate(doc.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          title="Abrir documento"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            deletingDocId === doc.id
                              ? "text-white bg-red-600 hover:bg-red-700"
                              : "text-gray-500 hover:text-red-600 hover:bg-red-50"
                          }`}
                          title={deletingDocId === doc.id ? "Clique para confirmar" : "Excluir"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DADOS PRIVADOS */}
        {activeTab === "privado" && (
          <div className="space-y-6">
            {/* Alerta de privacidade */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <Lock className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Dados privados</p>
                <p className="text-sm text-blue-700">
                  Essas informações são apenas para seu controle e não aparecem no anúncio público.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contato do proprietário */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Contato do Proprietário
                </h3>
                <div className="space-y-3">
                  {property.privateOwnerName && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Nome</p>
                      <p className="text-gray-900">{property.privateOwnerName}</p>
                    </div>
                  )}
                  {property.privateOwnerPhone && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Telefone</p>
                      <p className="text-gray-900 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {property.privateOwnerPhone}
                      </p>
                    </div>
                  )}
                  {property.privateOwnerEmail && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">E-mail</p>
                      <p className="text-gray-900 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {property.privateOwnerEmail}
                      </p>
                    </div>
                  )}
                  {property.privateOwnerAddress && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Endereço do proprietário</p>
                      <p className="text-gray-900">{property.privateOwnerAddress}</p>
                    </div>
                  )}
                  {!property.privateOwnerName && !property.privateOwnerPhone && !property.privateOwnerEmail && (
                    <p className="text-gray-400 text-sm">Nenhum dado de contato cadastrado.</p>
                  )}
                </div>
              </div>

              {/* Valores e comissão */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Valores e Comissão
                </h3>
                <div className="space-y-3">
                  {property.privateOwnerPrice && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Valor desejado pelo proprietário</p>
                      <p className="text-gray-900 font-semibold">{formatPrice(property.privateOwnerPrice)}</p>
                    </div>
                  )}
                  {property.privateBrokerFeePercent && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Taxa de corretagem</p>
                      <p className="text-gray-900">{property.privateBrokerFeePercent}%</p>
                    </div>
                  )}
                  {property.privateBrokerFeeFixed && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Taxa fixa</p>
                      <p className="text-gray-900">{formatPrice(property.privateBrokerFeeFixed)}</p>
                    </div>
                  )}
                  {!property.privateOwnerPrice && !property.privateBrokerFeePercent && !property.privateBrokerFeeFixed && (
                    <p className="text-gray-400 text-sm">Nenhuma informação financeira cadastrada.</p>
                  )}
                </div>
              </div>

              {/* Exclusividade */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                  Exclusividade
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {property.privateExclusive ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-green-700 font-medium">Imóvel exclusivo</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-500">Não exclusivo</span>
                      </>
                    )}
                  </div>
                  {property.privateExclusiveUntil && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Exclusividade até</p>
                      <p className="text-gray-900">{formatDate(property.privateExclusiveUntil)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Situação do imóvel */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-600" />
                  Situação do Imóvel
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {property.privateOccupied ? (
                      <>
                        <Clock className="w-5 h-5 text-amber-600" />
                        <span className="text-amber-700 font-medium">Ocupado</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-green-700">Desocupado</span>
                      </>
                    )}
                  </div>
                  {property.privateOccupantInfo && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Informações do ocupante</p>
                      <p className="text-gray-900">{property.privateOccupantInfo}</p>
                    </div>
                  )}
                  {property.privateKeyLocation && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Localização da chave</p>
                      <p className="text-gray-900 flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        {property.privateKeyLocation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notas internas */}
            {property.privateNotes && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Observações internas</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{property.privateNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
