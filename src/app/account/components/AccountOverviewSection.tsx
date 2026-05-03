"use client";

import { useRef } from "react";
import Image from "next/image";
import { ArrowRight, Camera, CheckCircle2, Mail, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SectionCard, StatusBadge } from "@/app/profile/components/ProfilePrimitives";
import { formatRealtorTypeLabel, formatRoleLabel, type UserProfile } from "@/app/profile/types";
import type { AccountSettingsNavItem } from "./AccountSettingsSidebar";

function fallbackInitial(name?: string | null) {
  return (String(name || "P").trim().charAt(0) || "P").toUpperCase();
}

export function AccountOverviewSection({
  profile,
  publicUrl,
  uploadingAvatar,
  onUploadAvatar,
  onGoToSection,
  navItems,
}: {
  profile: UserProfile;
  publicUrl: string | null;
  uploadingAvatar: boolean;
  onUploadAvatar: (file: File) => Promise<boolean> | boolean;
  onGoToSection: (id: string) => void;
  navItems: AccountSettingsNavItem[];
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const subtitleParts = [formatRoleLabel(profile.role), formatRealtorTypeLabel(profile.realtorType), profile.realtorCreci ? `${profile.realtorCreci}${profile.realtorCreciState ? `/${profile.realtorCreciState}` : ""}` : null].filter(Boolean);
  const checklist = [
    { label: "Nome e identidade definidos", done: Boolean(String(profile.name || "").trim()) },
    { label: "Foto do perfil enviada", done: Boolean(profile.image) },
    { label: "Telefone verificado", done: Boolean(profile.phoneVerifiedAt) },
    { label: "Headline pública preenchida", done: Boolean(String(profile.publicHeadline || "").trim()) },
    { label: "Bio profissional pronta", done: Boolean(String(profile.publicBio || "").trim()) },
    { label: "Áreas de atuação cadastradas", done: Array.isArray(profile.publicServiceAreas) && profile.publicServiceAreas.length > 0 },
    { label: "Recuperação configurada", done: Boolean(profile.recoveryEmailVerifiedAt || profile.hasPassword) },
  ];
  const pendingChecklist = checklist.filter((item) => !item.done);

  const quickActions = navItems.filter((item) => item.id !== "overview").slice(0, 4);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px]">
      <SectionCard
        eyebrow="Visão geral"
        title="Seu centro de configurações"
        description="Aqui você acompanha o que já está pronto e o que ainda vale ajustar para deixar sua conta clara, segura e fácil de usar."
        actions={
          publicUrl ? <StatusBadge tone="success" label="Perfil público ativo" /> : <StatusBadge tone="warning" label="Perfil público incompleto" />
        }
      >
        <div className="rounded-[28px] border border-neutral-200 bg-gradient-to-br from-white via-white to-neutral-50 p-5 shadow-sm shadow-black/5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-100 shadow-sm">
                {profile.image ? (
                  <Image src={profile.image} alt={profile.name || "Avatar do perfil"} fill sizes="80px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-100 via-white to-cyan-100 text-2xl font-semibold text-teal-700">
                    {fallbackInitial(profile.name)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">{profile.name || "Seu perfil"}</h2>
                  <StatusBadge tone="info" label={formatRoleLabel(profile.role)} />
                </div>
                <p className="mt-2 text-sm text-neutral-600">{subtitleParts.join(" · ") || "Complete seus dados principais para apresentar seu perfil com clareza."}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700">
                    <Mail className="h-3.5 w-3.5 text-teal-700" />
                    {profile.emailVerified ? "E-mail verificado" : "Verifique seu e-mail"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700">
                    <Phone className="h-3.5 w-3.5 text-teal-700" />
                    {profile.phoneVerifiedAt ? "Telefone pronto" : "Telefone pendente"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700">
                    <ShieldCheck className="h-3.5 w-3.5 text-teal-700" />
                    {profile.recoveryEmailVerifiedAt || profile.hasPassword ? "Recuperação pronta" : "Proteção pode melhorar"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" leftIcon={<Camera className="h-4 w-4" />} loading={uploadingAvatar} onClick={() => inputRef.current?.click()}>
                {uploadingAvatar ? "Enviando..." : "Trocar foto"}
              </Button>
              {publicUrl ? (
                <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
                  <Button type="button">Abrir perfil público</Button>
                </a>
              ) : null}
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void onUploadAvatar(file);
              }
              event.currentTarget.value = "";
            }}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm shadow-black/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-neutral-950">Checklist essencial</div>
                <p className="mt-1 text-sm text-neutral-600">O mínimo para um corretor configurar sem dor de cabeça.</p>
              </div>
              <StatusBadge tone={pendingChecklist.length === 0 ? "success" : "warning"} label={`${checklist.length - pendingChecklist.length}/${checklist.length} pronto`} />
            </div>
            <div className="mt-4 space-y-3">
              {checklist.map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50/70 px-4 py-3 text-sm text-neutral-800">
                  <CheckCircle2 className={`h-4 w-4 shrink-0 ${item.done ? "text-emerald-600" : "text-neutral-300"}`} />
                  <span className={item.done ? "text-neutral-900" : "text-neutral-600"}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm shadow-black/5">
            <div className="text-sm font-semibold text-neutral-950">Atalhos úteis</div>
            <p className="mt-1 text-sm text-neutral-600">Abra só o assunto que você quer resolver agora.</p>
            <div className="mt-4 grid gap-3">
              {quickActions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onGoToSection(item.id)}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-neutral-200 bg-neutral-50/70 px-4 py-4 text-left transition hover:border-neutral-300 hover:bg-white"
                >
                  <div className="flex min-w-0 gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-neutral-900">{item.label}</div>
                        {item.statusLabel ? <StatusBadge label={item.statusLabel} tone={item.statusTone || "neutral"} /> : null}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-neutral-500">{item.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-neutral-400" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <UserRound className="h-4 w-4 text-teal-700" />
              Nome público
            </div>
            <p className="mt-2 text-sm text-neutral-600">{profile.name || "Defina como você quer ser identificado"}</p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <MapPin className="h-4 w-4 text-teal-700" />
              Regiões atendidas
            </div>
            <p className="mt-2 text-sm text-neutral-600">
              {Array.isArray(profile.publicServiceAreas) && profile.publicServiceAreas.length
                ? profile.publicServiceAreas.slice(0, 3).join(" • ")
                : "Adicione áreas para explicar onde você atua"}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4">
            <div className="text-sm font-semibold text-neutral-900">Link público</div>
            <p className="mt-2 break-all text-sm text-neutral-600">{publicUrl || "Disponível quando o perfil público estiver pronto"}</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
