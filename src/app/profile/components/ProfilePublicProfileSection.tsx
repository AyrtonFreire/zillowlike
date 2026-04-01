"use client";

import Link from "next/link";
import { Copy, ExternalLink, MapPin, Phone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import {
  formatRoleLabel,
  isOwnerLike,
  isRealtorOrAgency,
  type ProfileFieldErrors,
  type ProfileFormState,
  type UserProfile,
} from "../types";
import { InlineFeedbackBanner, SectionCard, StatusBadge } from "./ProfilePrimitives";

function checklistStatus(done: boolean) {
  return done ? "success" : "neutral";
}

export function ProfilePublicProfileSection({
  profile,
  form,
  fieldErrors,
  hasVerifiedPhone,
  publicUrl,
  saving,
  onFieldChange,
  onCopyLink,
}: {
  profile: UserProfile;
  form: ProfileFormState;
  fieldErrors: ProfileFieldErrors;
  hasVerifiedPhone: boolean;
  publicUrl: string | null;
  saving: boolean;
  onFieldChange: <K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) => void;
  onCopyLink: () => Promise<boolean> | boolean;
}) {
  const roleLabel = formatRoleLabel(profile.role);
  const isBrokerProfile = isRealtorOrAgency(profile.role);
  const isOwnerProfile = isOwnerLike(profile.role);
  const checklist = [
    { label: "Headline preenchida", done: form.publicHeadline.trim().length > 0 },
    { label: "Bio preenchida", done: form.publicBio.trim().length > 0 },
    { label: "Cidade e UF informadas", done: form.publicCity.trim().length > 0 && form.publicState.trim().length === 2 },
    ...(isBrokerProfile ? [{ label: "Telefone verificado para exibição", done: hasVerifiedPhone }] : []),
  ];
  const publicLocation = [form.publicCity.trim(), form.publicState.trim()].filter(Boolean).join(", ");
  const canOpenPublicProfile = Boolean(publicUrl);
  const phoneCheckboxDescription = hasVerifiedPhone
    ? "Quando ativo, o telefone só aparece no perfil público porque já está verificado."
    : "Verifique seu telefone primeiro para poder exibi-lo no perfil público e nas ações de contato.";
  const secondaryActionClassName =
    "inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-neutral-200/90 bg-white px-4.5 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm shadow-black/5 transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
  const primaryActionClassName =
    "inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-teal-700 via-teal-700 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-900/15 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-900/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:ring-offset-2";

  return (
    <SectionCard
      eyebrow="Perfil público"
      title={isBrokerProfile ? "Apresentação pública profissional" : "Perfil público do anunciante"}
      description={
        isBrokerProfile
          ? "Controle a primeira impressão do seu perfil compartilhável, com texto, localização e disponibilidade real de contato."
          : "Organize como seu perfil público aparece para compradores e locatários, sem prometer contato que ainda não está validado."
      }
      actions={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap xl:w-auto xl:justify-end">
          <Button
            type="button"
            variant="secondary"
            leftIcon={<Copy className="h-4 w-4" />}
            onClick={() => void onCopyLink()}
            disabled={!canOpenPublicProfile}
            className={secondaryActionClassName}
          >
            Copiar link
          </Button>
          {publicUrl ? (
            <Link href={publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
              <Button type="button" variant="primary" leftIcon={<ExternalLink className="h-4 w-4" />} className={primaryActionClassName}>
                Abrir perfil público
              </Button>
            </Link>
          ) : null}
        </div>
      }
    >
      {!hasVerifiedPhone && form.publicPhoneOptIn ? (
        <InlineFeedbackBanner
          tone="warning"
          title="Telefone público desativado automaticamente"
          message="A exibição pública do telefone depende de verificação. Quando você concluir essa etapa, poderá reativar a opção."
        />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="space-y-4">
          {isOwnerProfile ? (
            <Checkbox
              checked={form.publicProfileEnabled}
              onChange={(event) => onFieldChange("publicProfileEnabled", event.target.checked)}
              label="Ativar meu perfil público para que visitantes vejam meus anúncios e informações básicas"
            />
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Perfis de {roleLabel.toLowerCase()} usam página pública própria para portfólio, prova social e contato.
            </div>
          )}

          <Input
            label="Headline pública"
            value={form.publicHeadline}
            onChange={(event) => onFieldChange("publicHeadline", event.target.value)}
            error={fieldErrors.publicHeadline}
            maxLength={120}
            placeholder={isBrokerProfile ? "Especialista em imóveis prontos para morar" : "Anunciante com foco em imóveis bem cuidados"}
          />

          <Textarea
            label="Bio pública"
            value={form.publicBio}
            onChange={(event) => onFieldChange("publicBio", event.target.value)}
            error={fieldErrors.publicBio}
            maxLength={500}
            rows={5}
            placeholder="Conte rapidamente sua proposta de valor, regiões de atuação e diferenciais."
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Cidade pública"
              value={form.publicCity}
              onChange={(event) => onFieldChange("publicCity", event.target.value)}
              error={fieldErrors.publicCity}
              maxLength={80}
              placeholder="Petrolina"
            />
            <Input
              label="UF pública"
              value={form.publicState}
              onChange={(event) => onFieldChange("publicState", event.target.value.toUpperCase())}
              error={fieldErrors.publicState}
              maxLength={2}
              placeholder="PE"
            />
          </div>

          {isBrokerProfile ? (
            <div className={`rounded-2xl border p-4 ${hasVerifiedPhone ? "border-neutral-200 bg-white" : "border-amber-200 bg-amber-50/70"}`}>
              <Checkbox
                checked={hasVerifiedPhone ? form.publicPhoneOptIn : false}
                disabled={!hasVerifiedPhone || saving}
                onChange={(event) => onFieldChange("publicPhoneOptIn", event.target.checked)}
                label="Exibir telefone verificado no meu perfil público"
              />
              <p className="mt-2 text-sm text-neutral-600">{phoneCheckboxDescription}</p>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-neutral-200 bg-gradient-to-br from-white via-neutral-50 to-teal-50/70 p-5 shadow-sm shadow-black/5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
              <Sparkles className="h-4 w-4" />
              Prévia pública
            </div>
            <h3 className="mt-3 text-xl font-semibold tracking-tight text-neutral-950">{form.name.trim() || profile.name || "Seu nome público"}</h3>
            <p className="mt-2 text-sm font-medium text-neutral-700">{form.publicHeadline.trim() || "Adicione uma headline curta para destacar o que você oferece."}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge tone={form.publicProfileEnabled || isBrokerProfile ? "success" : "warning"} label={form.publicProfileEnabled || isBrokerProfile ? "Publicado" : "Privado"} />
              {isBrokerProfile ? (
                <StatusBadge tone={hasVerifiedPhone && form.publicPhoneOptIn ? "success" : "neutral"} label={hasVerifiedPhone && form.publicPhoneOptIn ? "Telefone visível" : "Telefone oculto"} />
              ) : null}
            </div>
            <div className="mt-4 space-y-2 text-sm text-neutral-600">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-neutral-400" />
                <span>{publicLocation || "Adicione cidade e UF para contextualizar o perfil"}</span>
              </div>
              {isBrokerProfile ? (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-neutral-400" />
                  <span>{hasVerifiedPhone && form.publicPhoneOptIn ? profile.phone || "Telefone pronto para exibição" : "Contato por telefone indisponível no perfil público"}</span>
                </div>
              ) : null}
            </div>
            <div className="mt-4 rounded-2xl border border-dashed border-neutral-200 bg-white/80 p-4 text-sm leading-relaxed text-neutral-600">
              {form.publicBio.trim() || "Sua bio aparecerá aqui quando você preencher um resumo curto do seu perfil, estilo de atendimento e áreas de atuação."}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-black/5">
            <div className="text-sm font-semibold text-neutral-950">Checklist de publicação</div>
            <div className="mt-3 space-y-2">
              {checklist.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2">
                  <span className="text-sm text-neutral-700">{item.label}</span>
                  <StatusBadge label={item.done ? "Ok" : "Pendente"} tone={checklistStatus(item.done)} />
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-neutral-500">
              {isBrokerProfile
                ? "O link público só expõe telefone quando a conta mantém um número válido e verificado. Se o telefone mudar, a verificação precisa ser refeita."
                : "Mantenha nome, resumo e localização consistentes para que seu perfil público de anunciante fique claro e confiável."}
            </p>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
