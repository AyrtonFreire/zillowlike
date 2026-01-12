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
  Phone,
  KeyRound,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PhoneVerificationModal from "@/components/PhoneVerificationModal";
import EmailChangeModal from "@/components/EmailChangeModal";
import RecoveryEmailModal from "@/components/RecoveryEmailModal";
import SetPasswordModal from "@/components/SetPasswordModal";
import BackupCodesModal from "@/components/BackupCodesModal";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  emailVerified: Date | null;
  phone?: string | null;
  phoneVerifiedAt: Date | null;
  recoveryEmail?: string | null;
  recoveryEmailVerifiedAt?: Date | null;
  backupCodes?: { total: number; unused: number };
  hasPassword?: boolean;
  stats: {
    properties: number;
    favorites: number;
    leadsReceived: number;
    leadsSent: number;
  };
  publicSlug?: string | null;
  publicProfileEnabled?: boolean;
  publicHeadline?: string | null;
  publicBio?: string | null;
  publicCity?: string | null;
  publicState?: string | null;
  publicPhoneOptIn?: boolean;

  realtorCreci?: string | null;
  realtorCreciState?: string | null;
  realtorType?: "AUTONOMO" | "IMOBILIARIA" | string | null;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [phoneModalStartInEdit, setPhoneModalStartInEdit] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [recoveryEmailModalOpen, setRecoveryEmailModalOpen] = useState(false);
  const [setPasswordModalOpen, setSetPasswordModalOpen] = useState(false);
  const [backupCodesModalOpen, setBackupCodesModalOpen] = useState(false);
  const [publicProfileEnabled, setPublicProfileEnabled] = useState(false);
  const [publicHeadline, setPublicHeadline] = useState("");
  const [publicBio, setPublicBio] = useState("");
  const [publicCity, setPublicCity] = useState("");
  const [publicState, setPublicState] = useState("");
  const [publicPhoneOptIn, setPublicPhoneOptIn] = useState(false);

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
        setPhone(data.user.phone || "");
        setPublicProfileEnabled(Boolean(data.user.publicProfileEnabled));
        setPublicHeadline(data.user.publicHeadline || "");
        setPublicBio(data.user.publicBio || "");
        setPublicCity(data.user.publicCity || "");
        setPublicState(data.user.publicState || "");
        setPublicPhoneOptIn(Boolean(data.user.publicPhoneOptIn));
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
        body: JSON.stringify({
          name,
          publicProfileEnabled,
          publicHeadline,
          publicBio,
          publicCity,
          publicState,
          publicPhoneOptIn,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile((prev) => (prev ? ({ ...prev, ...data.user } as any) : (data.user as any)));
        setName(data.user.name || "");
        setPhone(data.user.phone || "");
        setPublicProfileEnabled(Boolean(data.user.publicProfileEnabled));
        setPublicHeadline(data.user.publicHeadline || "");
        setPublicBio(data.user.publicBio || "");
        setPublicCity(data.user.publicCity || "");
        setPublicState(data.user.publicState || "");
        setPublicPhoneOptIn(Boolean(data.user.publicPhoneOptIn));
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
          setProfile((prev) => (prev ? ({ ...prev, ...data.user } as any) : (data.user as any)));
          await update();
        }
      }
    } catch (error) {
      console.error("Error uploading:", error);
      alert("Erro no upload da imagem");
    } finally {
      setUploadingImage(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const config = {
      ADMIN: { label: "Administrador", color: "bg-purple-100 text-purple-800" },
      REALTOR: { label: "Corretor", color: "bg-blue-100 text-blue-800" },
      AGENCY: { label: "Agência", color: "bg-teal-100 text-teal-800" },
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

  const isRealtorOrAgency = profile.role === "REALTOR" || profile.role === "AGENCY";

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
                  <label className="absolute bottom-0 right-0 p-2 glass-teal text-white rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-colors">
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
                
                {/* Phone Verified */}
                {profile.phoneVerifiedAt && (
                  <div className="flex items-center justify-center gap-1 mt-3 text-sm text-green-600">
                    <Check className="w-4 h-4" />
                    Telefone verificado
                  </div>
                )}

                {/* Recovery Email Verified */}
                {profile.recoveryEmailVerifiedAt && (
                  <div className="flex items-center justify-center gap-1 mt-3 text-sm text-green-600">
                    <Check className="w-4 h-4" />
                    E-mail de recuperação verificado
                  </div>
                )}

                {profile.backupCodes?.unused && profile.backupCodes.unused > 0 && (
                  <div className="flex items-center justify-center gap-1 mt-3 text-sm text-green-600">
                    <Check className="w-4 h-4" />
                    Backup codes configurados
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

              {profile.role === "REALTOR" && (profile.realtorCreci || profile.realtorType) && (
                <div className="mt-4 border-t border-gray-200 pt-4 text-xs text-gray-700 space-y-1">
                  <p className="font-semibold text-gray-900">Dados profissionais (corretor)</p>
                  {profile.realtorCreci && (
                    <p>
                      CRECI: {profile.realtorCreci}
                      {profile.realtorCreciState && ` / ${profile.realtorCreciState}`}
                    </p>
                  )}
                  {profile.realtorType && (
                    <p>
                      Tipo de atuação: {profile.realtorType === "AUTONOMO" ? "Corretor(a) autônomo(a)" : profile.realtorType === "IMOBILIARIA" ? "Imobiliária" : profile.realtorType}
                    </p>
                  )}
                </div>
              )}
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

                {/* Backup Codes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Backup codes
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={
                        profile.backupCodes
                          ? `${profile.backupCodes.unused} disponíveis (${profile.backupCodes.total} no total)`
                          : "(carregando...)"
                      }
                      readOnly
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Códigos de uso único para recuperar a conta sem e-mail/telefone.
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    {profile.backupCodes?.unused && profile.backupCodes.unused > 0 ? (
                      <p className="text-xs text-emerald-700 font-medium">Você tem {profile.backupCodes.unused} backup codes disponíveis</p>
                    ) : (
                      <p className="text-xs text-gray-600">Você ainda não gerou backup codes.</p>
                    )}

                    <button
                      type="button"
                      onClick={() => setBackupCodesModalOpen(true)}
                      className="glass-teal text-white font-medium rounded-lg transition-colors"
                    >
                      {profile.backupCodes?.total ? "Gerar novos backup codes" : "Gerar backup codes"}
                    </button>
                    <p className="text-xs text-gray-500">
                      Para recuperar com backup code: <Link href="/auth/recover-backup-code" className="underline">/auth/recover-backup-code</Link>
                    </p>
                  </div>
                </div>

                {/* Password (OAuth accounts) */}
                {!profile.hasPassword && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Senha
                    </label>
                    <div className="text-xs text-gray-600">
                      Sua conta ainda não tem senha (provavelmente você entrou via Google/GitHub). Defina uma senha para ter um método extra de acesso.
                    </div>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setSetPasswordModalOpen(true)}
                        className="glass-teal text-white font-medium rounded-lg transition-colors"
                      >
                        Criar senha
                      </button>
                    </div>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={profile.email || ""}
                      readOnly
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>
                  <div className="mt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setEmailModalOpen(true)}
                      className="glass-teal text-white font-medium rounded-lg transition-colors"
                    >
                      Alterar e-mail
                    </button>
                    <p className="text-xs text-gray-500">
                      Você receberá um código no novo e-mail para confirmar a troca.
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      readOnly
                      placeholder="(DDD) 9 9999-9999"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Este telefone pode ser usado para contatos sobre seus imóveis.
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    {profile.phone ? (
                      profile.phoneVerifiedAt ? (
                        <p className="text-xs text-emerald-700 font-medium">Telefone verificado</p>
                      ) : (
                        <p className="text-xs text-amber-700 font-medium">Telefone ainda não verificado</p>
                      )
                    ) : (
                      <p className="text-xs text-gray-600">Você ainda não adicionou um telefone.</p>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const hasPhone = Boolean((profile.phone || "").trim());
                        const isVerified = Boolean(profile.phoneVerifiedAt);
                        setPhoneModalStartInEdit(!hasPhone || isVerified);
                        setPhoneModalOpen(true);
                      }}
                      className="glass-teal text-white font-medium rounded-lg transition-colors"
                    >
                      {profile.phone ? (profile.phoneVerifiedAt ? "Alterar telefone" : "Verificar telefone") : "Adicionar telefone"}
                    </button>
                  </div>
                </div>

                {/* Recovery Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail de recuperação
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={String(profile.recoveryEmail || "")}
                      readOnly
                      placeholder="(não configurado)"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Use um e-mail alternativo para recuperar sua conta caso perca acesso ao e-mail principal.
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    {profile.recoveryEmail ? (
                      profile.recoveryEmailVerifiedAt ? (
                        <p className="text-xs text-emerald-700 font-medium">E-mail de recuperação verificado</p>
                      ) : (
                        <p className="text-xs text-amber-700 font-medium">E-mail de recuperação ainda não verificado</p>
                      )
                    ) : (
                      <p className="text-xs text-gray-600">Você ainda não configurou um e-mail de recuperação.</p>
                    )}

                    <button
                      type="button"
                      onClick={() => setRecoveryEmailModalOpen(true)}
                      className="glass-teal text-white font-medium rounded-lg transition-colors"
                    >
                      {profile.recoveryEmail ? "Alterar e-mail de recuperação" : "Adicionar e-mail de recuperação"}
                    </button>
                  </div>
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
              </div>
            </div>

            {/* Public profile settings for realtors/agencies */}
            {isRealtorOrAgency && (
              <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Perfil público de corretor
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Seu perfil de corretor é sempre público quando você tem um link público. Use esta seção apenas para ajustar
                  texto e cidade/estado exibidos.
                </p>

                <div className="space-y-5">
                  {/* Estado do perfil */}
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Perfil público sempre ativo</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Corretores e imobiliárias têm sempre uma página pública ativa. Basta compartilhar o link abaixo com seus
                        clientes.
                      </p>
                      {profile.publicSlug && (
                        <p className="text-xs text-blue-600 mt-2">
                          Seu link público:
                          {" "}
                          <Link
                            href={`/realtor/${profile.publicSlug}`}
                            className="underline break-all"
                            target="_blank"
                          >
                            {`/realtor/${profile.publicSlug}`}
                          </Link>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Headline */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frase de apresentação
                    </label>
                    <input
                      type="text"
                      value={publicHeadline}
                      onChange={(e) => setPublicHeadline(e.target.value)}
                      placeholder="Ex: Especialista em imóveis residenciais em Petrolina e região."
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  {/* Cidade/Estado */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cidade
                      </label>
                      <input
                        type="text"
                        value={publicCity}
                        onChange={(e) => setPublicCity(e.target.value)}
                        placeholder="Ex: Petrolina"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estado (UF)
                      </label>
                      <input
                        type="text"
                        value={publicState}
                        onChange={(e) => setPublicState(e.target.value.toUpperCase())}
                        maxLength={2}
                        placeholder="Ex: PE"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm uppercase"
                      />
                    </div>
                  </div>

                  {/* Bio pública */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sobre você (bio pública)
                    </label>
                    <textarea
                      value={publicBio}
                      onChange={(e) => setPublicBio(e.target.value)}
                      rows={4}
                      placeholder="Conte um pouco sobre sua experiência, regiões onde atua e tipos de imóvel que costuma trabalhar. Evite incluir dados pessoais muito sensíveis."
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-y"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Essa descrição aparece na página pública e ajuda o cliente a entender seu estilo de atendimento.
                    </p>
                  </div>

                  {/* Opt-in de telefone público */}
                  <div className="flex items-start gap-3">
                    <input
                      id="public-phone-opt-in"
                      type="checkbox"
                      checked={publicPhoneOptIn}
                      onChange={(e) => setPublicPhoneOptIn(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <label
                        htmlFor="public-phone-opt-in"
                        className="text-sm font-medium text-gray-900"
                      >
                        Exibir meu telefone no perfil público
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Usaremos o mesmo telefone informado acima. Ele só será mostrado se estiver verificado e você marcar
                        essa opção. Os clientes ainda podem entrar em contato pela plataforma mesmo sem ver seu número.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {profile.role === "OWNER" && (
              <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Perfil público de anunciante
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Permite que outras pessoas vejam um perfil discreto com seus imóveis ativos, sem mostrar seus dados de
                  contato. Toda a conversa continua acontecendo pela plataforma.
                </p>

                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <input
                      id="owner-public-profile-enabled"
                      type="checkbox"
                      checked={publicProfileEnabled}
                      onChange={(e) => setPublicProfileEnabled(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <label
                        htmlFor="owner-public-profile-enabled"
                        className="text-sm font-medium text-gray-900"
                      >
                        Ativar meu perfil público discreto
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        O perfil mostra apenas um apelido, sua cidade/estado (se desejar) e os imóveis ativos que você já
                        anunciou na plataforma.
                      </p>
                      {publicProfileEnabled && profile.publicSlug && (
                        <p className="text-xs text-blue-600 mt-2">
                          Seu link público:
                          {" "}
                          <Link
                            href={`/owner/${profile.publicSlug}`}
                            className="underline break-all"
                            target="_blank"
                          >
                            {`/owner/${profile.publicSlug}`}
                          </Link>
                        </p>
                      )}
                    </div>
                  </div>

                  {publicProfileEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cidade
                        </label>
                        <input
                          type="text"
                          value={publicCity}
                          onChange={(e) => setPublicCity(e.target.value)}
                          placeholder="Ex: Petrolina"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Estado (UF)
                        </label>
                        <input
                          type="text"
                          value={publicState}
                          onChange={(e) => setPublicState(e.target.value.toUpperCase())}
                          maxLength={2}
                          placeholder="Ex: PE"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm uppercase"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end mt-6">
              {(() => {
                const unchanged =
                  name === (profile.name || "") &&
                  publicProfileEnabled === Boolean(profile.publicProfileEnabled) &&
                  publicHeadline === (profile.publicHeadline || "") &&
                  publicBio === (profile.publicBio || "") &&
                  publicCity === (profile.publicCity || "") &&
                  publicState === (profile.publicState || "") &&
                  publicPhoneOptIn === Boolean(profile.publicPhoneOptIn);
                return (
                  <button
                    onClick={handleSave}
                    disabled={saving || unchanged}
                    className="flex items-center gap-2 px-6 py-2.5 glass-teal disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
                  >
                    <Save className="w-5 h-5" />
                    {saving ? "Salvando..." : "Salvar Alterações"}
                  </button>
                );
              })()}
            </div>

            <RecoveryEmailModal
              isOpen={recoveryEmailModalOpen}
              onClose={() => setRecoveryEmailModalOpen(false)}
              currentRecoveryEmail={profile.recoveryEmail || null}
              onVerified={async (newEmail) => {
                setProfile((prev) =>
                  prev
                    ? ({
                        ...prev,
                        recoveryEmail: newEmail,
                        recoveryEmailVerifiedAt: new Date(),
                      } as any)
                    : prev
                );
                await fetchProfile();
                await update();
              }}
            />

            <SetPasswordModal
              isOpen={setPasswordModalOpen}
              onClose={() => setSetPasswordModalOpen(false)}
              onSuccess={async () => {
                await fetchProfile();
                await update();
              }}
            />

            <BackupCodesModal
              isOpen={backupCodesModalOpen}
              onClose={() => setBackupCodesModalOpen(false)}
              onGenerated={async () => {
                await fetchProfile();
                await update();
              }}
            />

            <PhoneVerificationModal
              isOpen={phoneModalOpen}
              onClose={() => setPhoneModalOpen(false)}
              onVerified={async () => {
                await fetchProfile();
                await update();
              }}
              phone={String(profile.phone || "")}
              allowEdit
              startInEdit={phoneModalStartInEdit}
              onPhoneChange={(newPhone) => {
                setPhone(newPhone || "");
                setProfile((prev) =>
                  prev
                    ? ({
                        ...prev,
                        phone: newPhone,
                        phoneVerifiedAt: null,
                      } as any)
                    : prev
                );
              }}
            />

            <EmailChangeModal
              isOpen={emailModalOpen}
              onClose={() => setEmailModalOpen(false)}
              currentEmail={String(profile.email || "")}
              onVerified={async (newEmail) => {
                await fetchProfile();
                await update();
                setProfile((prev) => (prev ? ({ ...prev, email: newEmail } as any) : prev));
              }}
            />

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
