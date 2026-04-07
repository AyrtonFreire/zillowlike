"use client";

import type { ReactElement } from "react";
import { useRef } from "react";
import Image from "next/image";
import { Camera, CheckCircle2, ShieldCheck, Phone, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatRealtorTypeLabel, formatRoleLabel, type UserProfile } from "../types";
import { SectionCard, StatTile, StatusBadge } from "./ProfilePrimitives";

function fallbackInitial(name?: string | null) {
  return (String(name || "P").trim().charAt(0) || "P").toUpperCase();
}

export function ProfileSummaryCard({
  profile,
  publicUrl,
  uploadingAvatar,
  onUploadAvatar,
}: {
  profile: UserProfile;
  publicUrl: string | null;
  uploadingAvatar: boolean;
  onUploadAvatar: (file: File) => Promise<boolean> | boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const verificationBadges = [
    profile.emailVerified ? { label: "E-mail verificado", tone: "success" as const, icon: <Mail className="h-3.5 w-3.5" /> } : null,
    profile.phoneVerifiedAt ? { label: "Telefone verificado", tone: "success" as const, icon: <Phone className="h-3.5 w-3.5" /> } : null,
    profile.recoveryEmailVerifiedAt ? { label: "Recuperação pronta", tone: "info" as const, icon: <ShieldCheck className="h-3.5 w-3.5" /> } : null,
  ].filter(Boolean) as Array<{ label: string; tone: "success" | "info"; icon: ReactElement }>;

  const subtitleParts = [formatRoleLabel(profile.role), formatRealtorTypeLabel(profile.realtorType), profile.realtorCreci ? `${profile.realtorCreci}${profile.realtorCreciState ? `/${profile.realtorCreciState}` : ""}` : null].filter(Boolean);

  return (
    <SectionCard
      eyebrow="Visão geral"
      title="Seu perfil"
      description="Mantenha seus dados essenciais, credenciais e presença pública alinhados antes de compartilhar seu perfil."
      actions={
        publicUrl ? (
          <StatusBadge tone="success" label="Perfil público disponível" />
        ) : (
          <StatusBadge tone="neutral" label="Perfil público ainda não publicado" />
        )
      }
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-100 shadow-sm">
            {profile.image ? (
              <Image src={profile.image} alt={profile.name || "Avatar do perfil"} fill className="object-cover" sizes="96px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-100 via-white to-cyan-100 text-3xl font-semibold text-teal-700">
                {fallbackInitial(profile.name)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">{profile.name || "Seu perfil"}</h1>
              <StatusBadge label={formatRoleLabel(profile.role)} tone="info" />
            </div>
            <p className="mt-2 text-sm text-neutral-600">{subtitleParts.join(" · ")}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {verificationBadges.length > 0 ? (
                verificationBadges.map((badge) => (
                  <span key={badge.label} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm">
                    {badge.icon}
                    {badge.label}
                  </span>
                ))
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Complete suas verificações para aumentar a confiança do perfil
                </span>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                leftIcon={<Camera className="h-4 w-4" />}
                loading={uploadingAvatar}
                onClick={() => inputRef.current?.click()}
              >
                {uploadingAvatar ? "Enviando avatar..." : "Atualizar avatar"}
              </Button>
              <span className="text-xs text-neutral-500">JPG, PNG ou WEBP. Até 10 MB.</span>
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
        </div>

        <div className="grid w-full grid-cols-2 gap-3 lg:max-w-sm">
          <StatTile label="Imóveis" value={String(profile.stats?.properties ?? 0)} helper="Ativos ou em gestão" />
          <StatTile label="Favoritos" value={String(profile.stats?.favorites ?? 0)} helper="Itens salvos" />
          <StatTile label="Leads recebidos" value={String(profile.stats?.leadsReceived ?? 0)} helper="Entradas da plataforma" />
          <StatTile label="Leads enviados" value={String(profile.stats?.leadsSent ?? 0)} helper="Conversas iniciadas" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
            <UserRound className="h-4 w-4 text-teal-700" />
            Nome público
          </div>
          <p className="mt-2 text-sm text-neutral-600">{profile.name || "Ainda não definido"}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4">
          <div className="text-sm font-semibold text-neutral-900">E-mail principal</div>
          <p className="mt-2 break-all text-sm text-neutral-600">{profile.email || "Não informado"}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4">
          <div className="text-sm font-semibold text-neutral-900">Telefone</div>
          <p className="mt-2 text-sm text-neutral-600">{profile.phone || "Adicione um telefone para ativar WhatsApp e recuperação"}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4">
          <div className="text-sm font-semibold text-neutral-900">Perfil público</div>
          <p className="mt-2 break-all text-sm text-neutral-600">{publicUrl || "Disponível após completar e publicar suas informações"}</p>
        </div>
      </div>
    </SectionCard>
  );
}
