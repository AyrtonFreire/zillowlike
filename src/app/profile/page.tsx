"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  User,
  Mail,
  Upload,
  Save,
  Home,
  Heart,
  MessageSquare,
  Shield,
  Calendar,
  Check,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  emailVerified: Date | null;
  stats: {
    properties: number;
    favorites: number;
    leadsReceived: number;
    leadsSent: number;
  };
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    } else if (status === "authenticated") {
      fetchProfile();
    }
  }, [status, router]);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (!response.ok) throw new Error("Failed to fetch");
      
      const data = await response.json();
      if (data.success) {
        setProfile(data.user);
        setName(data.user.name || "");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
        // Force session update
        await update();
        alert("Perfil atualizado com sucesso!");
      }
    } catch (error) {
      console.error("Error saving:", error);
      alert("Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      // Get signature
      const sigRes = await fetch("/api/upload/cloudinary-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "zillowlike/avatars" }),
      });
      const sig = await sigRes.json();

      // Upload
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", sig.apiKey);
      fd.append("timestamp", String(sig.timestamp));
      fd.append("signature", sig.signature);
      fd.append("folder", sig.folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
        { method: "POST", body: fd }
      );
      const uploadData = await uploadRes.json();

      if (uploadData.secure_url) {
        // Update profile
        const response = await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: uploadData.secure_url }),
        });

        if (response.ok) {
          const data = await response.json();
          setProfile(data.user);
          await update();
        }
      }
    } catch (error) {
      console.error("Error uploading:", error);
      alert("Erro no upload");
    } finally {
      setUploadingImage(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const config = {
      ADMIN: { label: "Administrador", color: "bg-purple-100 text-purple-800" },
      REALTOR: { label: "Corretor", color: "bg-blue-100 text-blue-800" },
      OWNER: { label: "Proprietário", color: "bg-green-100 text-green-800" },
      USER: { label: "Usuário", color: "bg-gray-100 text-gray-800" },
    };
    const { label, color } = config[role as keyof typeof config] || config.USER;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Meu Perfil"
        description="Gerenciar suas informações"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Perfil" },
        ]}
      >
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <DashboardLayout
      title="Meu Perfil"
      description="Gerenciar suas informações"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Perfil" },
      ]}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-center">
                {/* Avatar */}
                <div className="relative inline-block mb-4">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                    {profile.image ? (
                      <Image
                        src={profile.image}
                        alt={profile.name || "User"}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <User className="w-16 h-16" />
                      </div>
                    )}
                  </div>
                  
                  {/* Upload Button */}
                  <label className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-colors">
                    {uploadingImage ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                      disabled={uploadingImage}
                    />
                  </label>
                </div>

                {/* Name & Role */}
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {profile.name || "Sem nome"}
                </h2>
                {getRoleBadge(profile.role)}

                {/* Email Verified */}
                {profile.emailVerified && (
                  <div className="flex items-center justify-center gap-1 mt-3 text-sm text-green-600">
                    <Check className="w-4 h-4" />
                    Email verificado
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                {profile.role === "OWNER" && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Home className="w-4 h-4" />
                      <span className="text-sm">Imóveis</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {profile.stats.properties}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Heart className="w-4 h-4" />
                    <span className="text-sm">Favoritos</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {profile.stats.favorites}
                  </span>
                </div>

                {profile.role === "REALTOR" && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-600">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-sm">Leads</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {profile.stats.leadsSent}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Informações Pessoais
              </h3>

              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome completo"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={profile.email || ""}
                      disabled
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Email não pode ser alterado
                  </p>
                </div>

                {/* Role (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Conta
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={profile.role}
                      disabled
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={handleSave}
                    disabled={saving || name === profile.name}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
                  >
                    <Save className="w-5 h-5" />
                    {saving ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Acesso Rápido
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {profile.role === "OWNER" && (
                  <Link
                    href="/owner/properties"
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Home className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">
                      Meus Imóveis
                    </span>
                  </Link>
                )}
                
                <Link
                  href="/favorites"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Heart className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-gray-900">
                    Favoritos
                  </span>
                </Link>

                {profile.role === "REALTOR" && (
                  <Link
                    href="/broker/leads"
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-900">
                      Meus Leads
                    </span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
