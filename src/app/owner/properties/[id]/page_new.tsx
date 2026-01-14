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
  ExternalLink,
  Copy,
  CheckCircle,
  Pause,
  Play,
  Users,
  User,
  MessageSquare,
  Calendar,
  Phone,
  Mail,
  FileText,
  Upload,
  Trash2,
  Download,
  File,
  Globe,
  LockKeyhole,
  Lock,
  Key,
  DollarSign,
  Clock,
  XCircle,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { buildPropertyPath } from "@/lib/slug";
import PropertyAnalytics from "@/components/dashboard/PropertyAnalytics";
import PropertyQualityIndicator from "@/components/dashboard/PropertyQualityIndicator";
import { ptBR } from "@/lib/i18n/property";

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

export default function PropertyDetailPageNew() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
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
      setDeletingDocId(documentId);
      setTimeout(() => setDeletingDocId(null), 3000);
    }
  };

  const handleStatusToggle = async () => {
    if (!property) return;
    const newStatus = property.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    
    try {
      const response = await fetch(`/api/owner/properties/${property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setProperty(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      console.error("Error updating status:", error);
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

  // Quality calculations
  const calculateQualityScore = (): number => {
    if (!property) return 0;
    const checks = [
      property.images.length >= 5,
      property.description && property.description.length >= 100,
      property.bedrooms !== null,
      property.bathrooms !== null,
      property.areaM2 !== null,
      property.neighborhood !== null,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  };

  const getQualityChecks = () => {
    if (!property) return [];
    return [
      {
        label: `Fotos (${property.images.length}/5 mínimo)`,
        passed: property.images.length >= 5,
        importance: "critical" as const,
      },
      {
        label: "Descrição completa (min. 100 caracteres)",
        passed: !!(property.description && property.description.length >= 100),
        importance: "critical" as const,
      },
      {
        label: "Número de quartos informado",
        passed: property.bedrooms !== null,
        importance: "important" as const,
      },
      {
        label: "Número de banheiros informado",
        passed: property.bathrooms !== null,
        importance: "important" as const,
      },
      {
        label: "Área (m²) preenchida",
        passed: property.areaM2 !== null,
        importance: "important" as const,
      },
      {
        label: "Bairro especificado",
        passed: property.neighborhood !== null,
        importance: "nice" as const,
      },
    ];
  };

  // Mock analytics data (replace with real data from API)
  const analyticsData = {
    views: {
      total: property?._count?.views || 0,
      last7Days: Math.floor((property?._count?.views || 0) * 0.3),
      trend: 12,
    },
    leads: {
      total: leads.length,
      last7Days: leads.filter(l => {
        const daysDiff = (Date.now() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
      }).length,
      trend: 8,
    },
    favorites: {
      total: property?._count?.favorites || 0,
      last7Days: Math.floor((property?._count?.favorites || 0) * 0.4),
    },
    sources: {
      website: Math.floor((property?._count?.views || 0) * 0.6),
      olx: Math.floor((property?._count?.views || 0) * 0.2),
      google: Math.floor((property?._count?.views || 0) * 0.15),
      direct: Math.floor((property?._count?.views || 0) * 0.05),
    },
    conversionRate: property?._count?.views ? (leads.length / property._count.views) * 100 : 0,
    avgResponseTime: "2h 30min",
    contactMethods: {
      whatsapp: Math.floor(leads.length * 0.7),
      phone: Math.floor(leads.length * 0.2),
      email: Math.floor(leads.length * 0.1),
    },
  };

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

  return (
    <DashboardLayout
      title={property.title}
      breadcrumbs={[
        { label: "Meus Imóveis", href: "/owner/properties" },
        { label: property.title },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* (1) CABEÇALHO FORTE DO IMÓVEL */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Gallery */}
          <div className="grid grid-cols-4 gap-2 p-2">
            {property.images.length > 0 ? (
              <>
                <div className="col-span-4 md:col-span-2 md:row-span-2 relative aspect-[16/10] md:aspect-auto md:h-full bg-gray-100 rounded-xl overflow-hidden">
                  <Image
                    src={property.images[0].url}
                    alt={property.images[0].alt || property.title}
                    fill
                    className="object-cover"
                  />
                </div>
                {property.images.slice(1, 5).map((img, idx) => (
                  <div key={img.id} className="relative aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden">
                    <Image
                      src={img.url}
                      alt={img.alt || property.title}
                      fill
                      className="object-cover"
                    />
                    {idx === 3 && property.images.length > 5 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-lg font-semibold">
                          +{property.images.length - 5} fotos
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <div className="col-span-4 aspect-video bg-gray-100 flex items-center justify-center rounded-xl">
                <Home className="w-16 h-16 text-gray-300" />
              </div>
            )}
          </div>

          {/* Property Info */}
          <div className="p-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
              {/* Left: Title & Address */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={`px-4 py-1.5 text-sm font-semibold rounded-full ${
                      property.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : property.status === "PAUSED"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {property.status === "ACTIVE" ? "Ativo" : property.status === "PAUSED" ? "Pausado" : "Rascunho"}
                  </span>
                  <span className="text-sm text-gray-500">
                    {property.purpose === "RENT" ? "Aluguel" : "Venda"}
                  </span>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-3">{property.title}</h1>
                
                <div className="flex items-start gap-2 text-gray-600 mb-4">
                  <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span className="text-lg">
                    {property.street}
                    {property.neighborhood && `, ${property.neighborhood}`}
                    <br />
                    {property.city}/{property.state}
                    {property.postalCode && ` - CEP ${property.postalCode}`}
                  </span>
                </div>

                <div className="text-4xl font-extrabold text-teal-600 mb-6">
                  {formatPrice(property.price)}
                  {property.purpose === "RENT" && <span className="text-xl font-normal text-gray-500">/mês</span>}
                </div>

                {/* Property Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <div className="p-2 bg-teal-100 rounded-lg">
                      <Home className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Tipo</p>
                      <p className="font-semibold text-gray-900">{ptBR.type(property.type)}</p>
                    </div>
                  </div>

                  {property.bedrooms !== null && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Bed className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Quartos</p>
                        <p className="font-semibold text-gray-900">{property.bedrooms}</p>
                      </div>
                    </div>
                  )}

                  {property.bathrooms !== null && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Bath className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Banheiros</p>
                        <p className="font-semibold text-gray-900">{property.bathrooms}</p>
                      </div>
                    </div>
                  )}

                  {property.areaM2 !== null && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Maximize className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Área</p>
                        <p className="font-semibold text-gray-900">{property.areaM2} m²</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex flex-col gap-3 lg:min-w-[200px]">
                <Link
                  href={`/owner/properties/edit/${property.id}`}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors font-medium"
                >
                  <Edit2 className="w-5 h-5" />
                  Editar anúncio
                </Link>

                <a
                  href={buildPropertyPath(property.id, property.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl transition-colors font-medium"
                >
                  <ExternalLink className="w-5 h-5" />
                  Ver anúncio
                </a>

                <button
                  onClick={handleStatusToggle}
                  className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl transition-colors font-medium"
                >
                  {property.status === "ACTIVE" ? (
                    <>
                      <Pause className="w-5 h-5" />
                      Pausar
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Ativar
                    </>
                  )}
                </button>

                <button
                  onClick={copyLink}
                  className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl transition-colors font-medium"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-600">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copiar link
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Description */}
            {property.description && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Sobre este imóvel</h3>
                <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {property.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* (2) DESEMPENHO DO ANÚNCIO - ANTES DOS LEADS */}
        <PropertyAnalytics data={analyticsData} />

        {/* (3) QUALIDADE DO ANÚNCIO */}
        <PropertyQualityIndicator 
          checks={getQualityChecks()} 
          score={calculateQualityScore()} 
        />

        {/* (4) SÓ AGORA VEM LEADS & NEGOCIAÇÃO */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">👥 Leads & Negociação</h2>
            <p className="text-gray-600">
              Gerencie os interessados neste imóvel e acompanhe o andamento das negociações
            </p>
          </div>

          {/* Lead Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{leads.length}</div>
              <p className="text-sm text-gray-600">Leads totais</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {leads.filter(l => l.status === "COMPLETED").length}
              </div>
              <p className="text-sm text-gray-600">Fechados</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {leads.filter(l => l.status === "PENDING").length}
              </div>
              <p className="text-sm text-gray-600">Em andamento</p>
            </div>
          </div>

          {/* Leads List */}
          <div className="bg-white rounded-2xl border border-gray-200">
            {leads.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">Nenhum lead para este imóvel ainda.</p>
                <p className="text-sm text-gray-400">
                  Assim que alguém demonstrar interesse, você verá aqui.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {leads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/owner/leads/${lead.id}`}
                    className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-teal-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{lead.name}</p>
                        <p className="text-sm text-gray-500">{lead.email}</p>
                        {lead.phone && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Phone className="w-3.5 h-3.5" />
                            {lead.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          lead.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-700"
                            : lead.status === "COMPLETED"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {lead.status === "PENDING" ? "Pendente" : lead.status === "COMPLETED" ? "Concluído" : lead.status}
                      </span>
                      <p className="text-xs text-gray-400 mt-2">{formatDate(lead.createdAt)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Sections for Documents & Private Data */}
        <details className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <summary className="px-8 py-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between font-semibold text-gray-900">
            <span className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-600" />
              Documentos do imóvel ({documents.length})
            </span>
            <span className="text-gray-400">▼</span>
          </summary>
          <div className="px-8 pb-8">
            {/* Document management UI (same as before) */}
            <p className="text-sm text-gray-500 mb-4">
              Anexe escritura, IPTU, contratos e outros documentos
            </p>
            {/* ... rest of document management code ... */}
          </div>
        </details>

        <details className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <summary className="px-8 py-6 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between font-semibold text-gray-900">
            <span className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-600" />
              Dados Privados
            </span>
            <span className="text-gray-400">▼</span>
          </summary>
          <div className="px-8 pb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 mb-6">
              <Lock className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Dados privados</p>
                <p className="text-sm text-blue-700">
                  Essas informações são apenas para seu controle e não aparecem no anúncio público.
                </p>
              </div>
            </div>
            {/* ... rest of private data UI ... */}
          </div>
        </details>
      </div>
    </DashboardLayout>
  );
}
