"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Toast from "@/components/Toast";
import {
  User,
  MapPin,
  Phone,
  Instagram,
  Linkedin,
  Facebook,
  Globe,
  Save,
  Eye,
  Loader2,
  Plus,
  X,
  CheckCircle,
} from "lucide-react";

interface ProfileData {
  publicSlug: string;
  publicHeadline: string;
  publicBio: string;
  publicCity: string;
  publicState: string;
  publicPhoneOptIn: boolean;
  publicInstagram: string;
  publicLinkedIn: string;
  publicWhatsApp: string;
  publicFacebook: string;
  publicServiceAreas: string[];
}

export default function BrokerProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [newArea, setNewArea] = useState("");

  const [profile, setProfile] = useState<ProfileData>({
    publicSlug: "",
    publicHeadline: "",
    publicBio: "",
    publicCity: "",
    publicState: "",
    publicPhoneOptIn: false,
    publicInstagram: "",
    publicLinkedIn: "",
    publicWhatsApp: "",
    publicFacebook: "",
    publicServiceAreas: [],
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (status === "authenticated") {
      fetchData();
    }
  }, [status, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchProfile()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/broker/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile({
          publicSlug: data.publicSlug || "",
          publicHeadline: data.publicHeadline || "",
          publicBio: data.publicBio || "",
          publicCity: data.publicCity || "",
          publicState: data.publicState || "",
          publicPhoneOptIn: data.publicPhoneOptIn || false,
          publicInstagram: data.publicInstagram || "",
          publicLinkedIn: data.publicLinkedIn || "",
          publicWhatsApp: data.publicWhatsApp || "",
          publicFacebook: data.publicFacebook || "",
          publicServiceAreas: data.publicServiceAreas || [],
        });
      }
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const profileRes = await fetch("/api/broker/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      let profileError: string | null = null;

      if (!profileRes.ok) {
        const data = await profileRes.json().catch(() => null);
        profileError = data?.error || "Erro ao salvar perfil";
      }

      if (!profileError) {
        setToast({ message: "Alterações salvas com sucesso!", type: "success" });
      } else {
        setToast({ message: profileError || "Erro ao salvar alterações", type: "error" });
      }
    } catch (err) {
      setToast({ message: "Erro ao salvar alterações", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const addServiceArea = () => {
    if (newArea.trim() && !profile.publicServiceAreas.includes(newArea.trim())) {
      setProfile((p) => ({
        ...p,
        publicServiceAreas: [...p.publicServiceAreas, newArea.trim()],
      }));
      setNewArea("");
    }
  };

  const removeServiceArea = (area: string) => {
    setProfile((p) => ({
      ...p,
      publicServiceAreas: p.publicServiceAreas.filter((a) => a !== area),
    }));
  };

  const generateSlug = () => {
    const name = session?.user?.name || "";
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setProfile((p) => ({ ...p, publicSlug: slug || `corretor-${Date.now()}` }));
  };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
  const profileUrl = profile.publicSlug ? `${siteUrl}/realtor/${profile.publicSlug}` : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Ações */}
        <div className="flex items-center justify-end gap-3">
          {profileUrl && (
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Eye className="w-4 h-4" />
              Ver perfil
            </a>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Alterações
          </button>
        </div>

        {/* Perfil público (info apenas) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Globe className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Perfil público sempre ativo</h3>
              <p className="text-sm text-gray-500">
                Seu perfil de corretor é sempre visível para clientes quando você possui um link público.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900">Assistente offline</h3>
              <p className="mt-1 text-sm text-gray-600">Configurações de horário e logs ficam no Assistente.</p>
            </div>
            <Link
              href="/broker/assistant/offline"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100"
            >
              Abrir
            </Link>
          </div>
        </div>

        {/* URL do perfil */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-teal-600" />
            URL do seu perfil
          </h3>
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="flex items-center">
                <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-sm text-gray-500">
                  {siteUrl}/realtor/
                </span>
                <input
                  type="text"
                  value={profile.publicSlug}
                  onChange={(e) => setProfile((p) => ({ ...p, publicSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                  placeholder="seu-nome"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={generateSlug}
              className="px-4 py-2 text-sm font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100"
            >
              Gerar automático
            </button>
          </div>
          {profileUrl && (
            <p className="text-xs text-gray-500">
              Seu perfil: <span className="font-medium text-teal-600">{profileUrl}</span>
            </p>
          )}
        </div>

        {/* Informações básicas */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Informações básicas
          </h3>
          <Input
            label="Headline / Tagline"
            value={profile.publicHeadline}
            onChange={(e) => setProfile((p) => ({ ...p, publicHeadline: e.target.value }))}
            placeholder="Ex: Especialista em imóveis de alto padrão em Boa Viagem"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Biografia</label>
            <textarea
              value={profile.publicBio}
              onChange={(e) => setProfile((p) => ({ ...p, publicBio: e.target.value }))}
              placeholder="Conte um pouco sobre você, sua experiência e diferenciais..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            />
            <p className="mt-1 text-xs text-gray-500">{profile.publicBio.length}/500 caracteres</p>
          </div>
        </div>

        {/* Localização */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-500" />
            Localização
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Cidade"
              value={profile.publicCity}
              onChange={(e) => setProfile((p) => ({ ...p, publicCity: e.target.value }))}
              placeholder="Recife"
            />
            <Input
              label="Estado (sigla)"
              value={profile.publicState}
              onChange={(e) => setProfile((p) => ({ ...p, publicState: e.target.value.toUpperCase().slice(0, 2) }))}
              placeholder="PE"
              maxLength={2}
            />
          </div>
        </div>

        {/* Áreas de atuação */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-600" />
            Áreas de atuação
          </h3>
          <p className="text-sm text-gray-500">Adicione os bairros ou regiões onde você atua</p>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addServiceArea())}
              placeholder="Ex: Boa Viagem, Pina, Piedade..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <button
              onClick={addServiceArea}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {profile.publicServiceAreas.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.publicServiceAreas.map((area) => (
                <span
                  key={area}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-sm rounded-full border border-purple-100"
                >
                  {area}
                  <button onClick={() => removeServiceArea(area)} className="hover:text-purple-900">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Contato */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Phone className="w-5 h-5 text-green-600" />
            Contato
          </h3>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="phoneOptIn"
              checked={profile.publicPhoneOptIn}
              onChange={(e) => setProfile((p) => ({ ...p, publicPhoneOptIn: e.target.checked }))}
              className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
            />
            <label htmlFor="phoneOptIn" className="text-sm text-gray-700">
              Exibir meu telefone no perfil público
            </label>
          </div>

          <Input
            label="WhatsApp (com código do país)"
            value={profile.publicWhatsApp}
            onChange={(e) => setProfile((p) => ({ ...p, publicWhatsApp: e.target.value.replace(/\D/g, "") }))}
            placeholder="5581999999999"
          />
        </div>

        {/* Redes sociais */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Instagram className="w-5 h-5 text-pink-600" />
            Redes sociais
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Instagram className="w-4 h-4 inline mr-1.5 text-pink-500" />
                Instagram
              </label>
              <input
                type="text"
                value={profile.publicInstagram}
                onChange={(e) => setProfile((p) => ({ ...p, publicInstagram: e.target.value.replace("@", "") }))}
                placeholder="seu_usuario"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Linkedin className="w-4 h-4 inline mr-1.5 text-blue-600" />
                LinkedIn
              </label>
              <input
                type="text"
                value={profile.publicLinkedIn}
                onChange={(e) => setProfile((p) => ({ ...p, publicLinkedIn: e.target.value }))}
                placeholder="seu-perfil ou URL completa"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Facebook className="w-4 h-4 inline mr-1.5 text-blue-500" />
                Facebook
              </label>
              <input
                type="text"
                value={profile.publicFacebook}
                onChange={(e) => setProfile((p) => ({ ...p, publicFacebook: e.target.value }))}
                placeholder="sua.pagina ou URL completa"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Prévia */}
        {profile.publicSlug && (
          <div className="bg-gradient-to-r from-teal-600 to-blue-600 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-6 h-6" />
              <h3 className="font-semibold text-lg">Seu perfil está ativo!</h3>
            </div>
            <p className="text-white/90 text-sm mb-4">
              Compartilhe o link abaixo com seus clientes e nas redes sociais:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={profileUrl || ""}
                className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-sm text-white placeholder-white/60"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(profileUrl || "");
                  setToast({ message: "Link copiado!", type: "success" });
                }}
                className="px-4 py-2 bg-white text-teal-600 rounded-lg font-medium hover:bg-white/90"
              >
                Copiar
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
