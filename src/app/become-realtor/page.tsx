"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ModernNavbar } from "@/components/modern";
import { validateCPF, formatCPF } from "@/lib/validators/cpf";
import { validateCRECI, checkCRECIExpiry } from "@/lib/validators/creci";
import { 
  Upload, 
  FileText, 
  User, 
  Phone, 
  Calendar,
  MapPin,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info
} from "lucide-react";

const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const SPECIALTIES = [
  "Residencial",
  "Comercial",
  "Industrial",
  "Rural",
  "Lançamentos",
  "Alto Padrão",
  "Locação",
  "Venda",
];

export default function BecomeRealtorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    cpf: "",
    creci: "",
    creciState: "",
    creciExpiry: "",
    phone: "",
    experience: "",
    specialties: [] as string[],
    bio: "",
    acceptedTerms: false,
  });

  const [files, setFiles] = useState({
    creciDocument: null as File | null,
    identityDocument: null as File | null,
  });

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/api/auth/signin");
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSpecialtyToggle = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: "creciDocument" | "identityDocument") => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Arquivo muito grande. Tamanho máximo: 5MB");
        return;
      }
      
      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
      if (!validTypes.includes(file.type)) {
        setError("Tipo de arquivo inválido. Use JPG, PNG ou PDF");
        return;
      }
      
      setFiles(prev => ({ ...prev, [field]: file }));
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setWarnings([]);
    setLoading(true);

    try {
      // Validations
      // 1. Validar CPF
      if (!validateCPF(formData.cpf)) {
        throw new Error("CPF inválido");
      }

      // 2. Validar CRECI avançado
      const creciValidation = validateCRECI(formData.creci, formData.creciState);
      if (!creciValidation.valid) {
        throw new Error(creciValidation.message || "CRECI inválido");
      }
      
      // Adiciona warnings do CRECI
      if (creciValidation.warnings) {
        setWarnings(prev => [...prev, ...creciValidation.warnings!]);
      }

      // 3. Verifica validade do CRECI
      const expiryCheck = checkCRECIExpiry(new Date(formData.creciExpiry));
      if (expiryCheck.isExpired) {
        throw new Error("CRECI expirado. Renove antes de aplicar.");
      }
      if (expiryCheck.isExpiringSoon) {
        setWarnings(prev => [...prev, `CRECI expira em ${expiryCheck.daysUntilExpiry} dias. Considere renovar.`]);
      }

      if (!formData.creciState) {
        throw new Error("Selecione o estado do CRECI");
      }

      if (parseInt(formData.experience) < 0) {
        throw new Error("Anos de experiência deve ser um número positivo");
      }

      if (formData.specialties.length === 0) {
        throw new Error("Selecione pelo menos uma especialidade");
      }

      if (!files.creciDocument) {
        throw new Error("Upload do documento CRECI é obrigatório");
      }

      if (!files.identityDocument) {
        throw new Error("Upload do documento de identidade é obrigatório");
      }

      if (!formData.acceptedTerms) {
        throw new Error("Você deve aceitar os termos e condições");
      }

      // Upload files first
      const uploadFormData = new FormData();
      uploadFormData.append("creciDocument", files.creciDocument);
      uploadFormData.append("identityDocument", files.identityDocument);

      const uploadRes = await fetch("/api/realtor/upload-documents", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadRes.ok) {
        throw new Error("Erro ao fazer upload dos documentos");
      }

      const { creciDocumentUrl, identityDocumentUrl } = await uploadRes.json();

      // Submit application
      const applicationRes = await fetch("/api/realtor/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          experience: parseInt(formData.experience),
          creciDocumentUrl,
          identityDocumentUrl,
        }),
      });

      if (!applicationRes.ok) {
        const errorData = await applicationRes.json();
        throw new Error(errorData.error || "Erro ao enviar aplicação");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/realtor");
      }, 3000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ModernNavbar forceLight />
        <div className="mt-16 max-w-2xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Aplicação Enviada com Sucesso!
            </h2>
            <p className="text-gray-600 mb-4">
              Sua aplicação para se tornar corretor foi enviada e está em análise.
              Você receberá um email assim que for aprovada.
            </p>
            <p className="text-sm text-gray-500">
              Redirecionando para o dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernNavbar forceLight />
      
      <div className="mt-16 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r glass-teal rounded-2xl shadow-lg p-8 mb-8 text-white">
          <h1 className="text-4xl font-bold mb-2">Seja um Corretor</h1>
          <p className="text-white/90">
            Junte-se à nossa plataforma e comece a receber leads qualificados
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3 mb-2">
                <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="font-semibold text-yellow-800">Avisos:</p>
              </div>
              <ul className="ml-8 space-y-1">
                {warnings.map((warning, idx) => (
                  <li key={idx} className="text-sm text-yellow-700">• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Dados Profissionais */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-blue-600" />
              Dados Profissionais
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CPF */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPF *
                </label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={(e) => {
                    const formatted = formatCPF(e.target.value);
                    setFormData(prev => ({ ...prev, cpf: formatted }));
                  }}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* CRECI */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número do CRECI *
                </label>
                <input
                  type="text"
                  name="creci"
                  value={formData.creci}
                  onChange={handleInputChange}
                  placeholder="123456 ou 123456-F"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Estado do CRECI */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado do CRECI *
                </label>
                <select
                  name="creciState"
                  value={formData.creciState}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  {BRAZILIAN_STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              {/* Validade do CRECI */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Validade do CRECI *
                </label>
                <input
                  type="date"
                  name="creciExpiry"
                  value={formData.creciExpiry}
                  onChange={handleInputChange}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(87) 99999-9999"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Anos de Experiência */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anos de Experiência *
                </label>
                <input
                  type="number"
                  name="experience"
                  value={formData.experience}
                  onChange={handleInputChange}
                  min="0"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Especialidades */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Especialidades * (selecione pelo menos uma)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SPECIALTIES.map(specialty => (
                <button
                  key={specialty}
                  type="button"
                  onClick={() => handleSpecialtyToggle(specialty)}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    formData.specialties.includes(specialty)
                      ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {specialty}
                </button>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Apresentação (opcional)
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={4}
              placeholder="Conte um pouco sobre sua experiência e diferenciais..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Upload de Documentos */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Documentos
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CRECI Document */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Documento CRECI * (JPG, PNG ou PDF - máx 5MB)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e, "creciDocument")}
                    className="hidden"
                    id="creci-upload"
                  />
                  <label htmlFor="creci-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {files.creciDocument ? files.creciDocument.name : "Clique para fazer upload"}
                    </p>
                  </label>
                </div>
              </div>

              {/* Identity Document */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RG ou CNH * (JPG, PNG ou PDF - máx 5MB)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e, "identityDocument")}
                    className="hidden"
                    id="identity-upload"
                  />
                  <label htmlFor="identity-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {files.identityDocument ? files.identityDocument.name : "Clique para fazer upload"}
                    </p>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Termos */}
          <div className="mb-8">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="acceptedTerms"
                checked={formData.acceptedTerms}
                onChange={handleInputChange}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Eu aceito os{" "}
                <a href="/terms" className="text-blue-600 hover:underline">
                  termos e condições
                </a>{" "}
                e confirmo que todas as informações fornecidas são verdadeiras *
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r glass-teal text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Aplicação"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
