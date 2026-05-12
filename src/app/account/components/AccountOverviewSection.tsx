"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bell, BriefcaseBusiness, Building2, Camera, CheckCircle2, Loader2, Mail, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SectionCard, StatusBadge } from "@/app/profile/components/ProfilePrimitives";
import { formatRealtorTypeLabel, formatRoleLabel, type UserProfile } from "@/app/profile/types";
import type { AccountSettingsNavItem } from "./AccountSettingsSidebar";

function fallbackInitial(name?: string | null) {
  return (String(name || "P").trim().charAt(0) || "P").toUpperCase();
}

type GuidedStepSection = "professional" | "access" | "public";

type GuidedStep = {
  title: string;
  description: string;
  done: boolean;
  section: GuidedStepSection;
};

type EmailSubscriptionResponse = {
  success?: boolean;
  subscription: {
    email: string;
    status?: string | null;
    frequency?: string | null;
    subscribedToDigest?: boolean;
    updatedAt?: string | null;
  } | null;
};

function formatNewsletterUpdatedAt(value?: string | null) {
  if (!value) return "Ainda não ajustada";
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return "Ainda não ajustada";
  }
}

export function AccountOverviewSection({
  profile,
  publicUrl,
  brokerOnboarding = false,
  uploadingAvatar,
  onUploadAvatar,
  onGoToSection,
  navItems,
}: {
  profile: UserProfile;
  publicUrl: string | null;
  brokerOnboarding?: boolean;
  uploadingAvatar: boolean;
  onUploadAvatar: (file: File) => Promise<boolean> | boolean;
  onGoToSection: (id: string) => void;
  navItems: AccountSettingsNavItem[];
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [newsletterLoading, setNewsletterLoading] = useState(true);
  const [newsletterSaving, setNewsletterSaving] = useState(false);
  const [newsletterEnabled, setNewsletterEnabled] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState(String(profile.email || ""));
  const [newsletterUpdatedAt, setNewsletterUpdatedAt] = useState<string | null>(null);
  const [newsletterError, setNewsletterError] = useState<string | null>(null);
  const isProfessionalAccount = profile.role === "REALTOR" || profile.role === "AGENCY";
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
  const checklistTitle = profile.role === "AGENCY" ? "Checklist essencial da conta principal" : profile.role === "REALTOR" ? "Checklist essencial do corretor" : "Checklist essencial da conta";
  const checklistDescription = profile.role === "AGENCY" ? "O mínimo para a conta da imobiliária ficar clara, segura e pronta para operar." : profile.role === "REALTOR" ? "O mínimo para um corretor configurar sem dor de cabeça." : "Os pontos que mais ajudam sua conta a ficar pronta antes de escolher um caminho profissional.";
  const guidedSteps = useMemo<GuidedStep[]>(
    () => [
      {
        title: "Revise identidade e foto",
        description: "Defina como você quer aparecer e envie uma foto para gerar confiança logo no início.",
        done: Boolean(String(profile.name || "").trim()) && Boolean(profile.image),
        section: "professional",
      },
      {
        title: "Garanta acesso e recuperação",
        description: "Verifique telefone e configure recuperação para não perder acesso à conta profissional.",
        done: Boolean(profile.phoneVerifiedAt) && Boolean(profile.recoveryEmailVerifiedAt || profile.hasPassword),
        section: "access",
      },
      {
        title: "Escreva sua apresentação",
        description: "Complete headline e bio para explicar rapidamente quem você atende e como trabalha.",
        done: Boolean(String(profile.publicHeadline || "").trim()) && Boolean(String(profile.publicBio || "").trim()),
        section: "public",
      },
      {
        title: "Defina regiões atendidas",
        description: "Mostre em quais bairros, cidades ou regiões você atua para facilitar a compreensão do seu perfil.",
        done: Array.isArray(profile.publicServiceAreas) && profile.publicServiceAreas.length > 0,
        section: "public",
      },
      {
        title: "Publique seu perfil",
        description: "Quando tudo estiver pronto, use sua apresentação pública para compartilhar seu posicionamento com mais clareza.",
        done: Boolean(publicUrl),
        section: "public",
      },
    ],
    [profile, publicUrl]
  );
  const nextGuidedStep = guidedSteps.find((step) => !step.done) || null;

  const quickActions = navItems.filter((item) => item.id !== "overview").slice(0, 4);

  const loadNewsletterPreferences = useCallback(async () => {
    try {
      setNewsletterLoading(true);
      setNewsletterError(null);
      const response = await fetch("/api/email-subscriptions", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as EmailSubscriptionResponse | null;
      if (!response.ok || !payload?.success) {
        setNewsletterError("Não foi possível carregar a newsletter semanal.");
        return;
      }

      setNewsletterEmail(payload.subscription?.email || String(profile.email || ""));
      setNewsletterUpdatedAt(payload.subscription?.updatedAt || null);
      setNewsletterEnabled(
        Boolean(payload.subscription?.subscribedToDigest ?? true) && String(payload.subscription?.status || "ACTIVE").toUpperCase() === "ACTIVE"
      );
    } catch {
      setNewsletterError("Não foi possível carregar a newsletter semanal.");
    } finally {
      setNewsletterLoading(false);
    }
  }, [profile.email]);

  useEffect(() => {
    void loadNewsletterPreferences();
  }, [loadNewsletterPreferences]);

  const handleNewsletterToggle = useCallback(async () => {
    const nextValue = !newsletterEnabled;

    try {
      setNewsletterSaving(true);
      setNewsletterError(null);
      const response = await fetch("/api/email-subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frequency: "WEEKLY",
          subscribedToDigest: nextValue,
          subscribedToGuides: false,
        }),
      });

      const payload = (await response.json().catch(() => null)) as EmailSubscriptionResponse | null;
      if (!response.ok || !payload?.success) {
        setNewsletterError("Não foi possível atualizar a newsletter semanal.");
        return;
      }

      setNewsletterEmail(payload.subscription?.email || String(profile.email || ""));
      setNewsletterUpdatedAt(payload.subscription?.updatedAt || new Date().toISOString());
      setNewsletterEnabled(
        Boolean(payload.subscription?.subscribedToDigest ?? nextValue) && String(payload.subscription?.status || "ACTIVE").toUpperCase() === "ACTIVE"
      );
    } catch {
      setNewsletterError("Não foi possível atualizar a newsletter semanal.");
    } finally {
      setNewsletterSaving(false);
    }
  }, [newsletterEnabled, profile.email]);

  return (
    <SectionCard
      eyebrow="Visão geral"
      title="Seu centro de configurações"
      description="Aqui você acompanha o que já está pronto e o que ainda vale ajustar para deixar sua conta clara, segura e fácil de usar."
      actions={
        isProfessionalAccount ? (publicUrl ? <StatusBadge tone="success" label="Perfil público ativo" /> : <StatusBadge tone="warning" label="Perfil público incompleto" />) : <StatusBadge tone="info" label="Escolha seu próximo passo" />
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
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
            <Button
              type="button"
              size="lg"
              variant="secondary"
              leftIcon={<Camera className="h-4 w-4" />}
              loading={uploadingAvatar}
              onClick={() => inputRef.current?.click()}
              className="min-w-[170px] justify-center"
            >
              {uploadingAvatar ? "Enviando..." : "Trocar foto"}
            </Button>
            {publicUrl ? (
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
                <Button type="button" size="lg" className="min-w-[220px] justify-center">
                  Abrir perfil público
                </Button>
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

      {brokerOnboarding && profile.role === "REALTOR" ? (
        <div className="rounded-[28px] border border-teal-200 bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-700 p-5 text-white shadow-sm shadow-black/10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-100">Onboarding do corretor</div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight">Seu perfil de corretor foi ativado. Agora falta deixar a operação realmente pronta.</h3>
              <p className="mt-3 text-sm leading-7 text-white/85">
                Em vez de te jogar em configurações genéricas, reunimos aqui os próximos passos mais importantes para você publicar uma apresentação clara, proteger o acesso e entrar no painel com mais segurança.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge tone="success" label={`${guidedSteps.filter((step) => step.done).length}/${guidedSteps.length} etapas concluídas`} />
                {nextGuidedStep ? <StatusBadge tone="warning" label={`Próxima: ${nextGuidedStep.title}`} /> : <StatusBadge tone="success" label="Perfil pronto para compartilhar" />}
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
              {nextGuidedStep ? (
                <Button
                  type="button"
                  size="lg"
                  className="min-w-[240px] justify-center bg-white text-teal-950 hover:bg-white/95"
                  onClick={() => onGoToSection(nextGuidedStep.section)}
                >
                  Resolver próxima etapa
                </Button>
              ) : (
                <Link href="/broker/dashboard" className="inline-flex">
                  <Button type="button" size="lg" className="min-w-[240px] justify-center bg-white text-teal-950 hover:bg-white/95">
                    Abrir painel do corretor
                  </Button>
                </Link>
              )}
              <Button
                type="button"
                size="lg"
                variant="secondary"
                className="min-w-[240px] justify-center border-white/30 bg-white/10 text-white hover:bg-white/15"
                onClick={() => onGoToSection("public")}
              >
                Ir para apresentação pública
              </Button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-5">
            {guidedSteps.map((step, index) => (
              <button
                key={step.title}
                type="button"
                onClick={() => onGoToSection(step.section)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${step.done ? "border-white/20 bg-white/14" : "border-white/12 bg-black/10 hover:bg-white/12"}`}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white/65">Etapa {index + 1}</div>
                <div className="mt-2 flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold text-white">{step.title}</div>
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${step.done ? "text-emerald-300" : "text-white/35"}`} />
                </div>
                <p className="mt-2 text-xs leading-6 text-white/78">{step.description}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {profile.role === "USER" ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm shadow-black/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <div className="text-sm font-semibold text-neutral-950">Escolha seu caminho profissional</div>
              <p className="mt-1 text-sm leading-7 text-neutral-600">
                Sua conta já está criada. Agora você pode ativar um perfil de corretor ou cadastrar a imobiliária no fluxo certo, sem precisar adivinhar qual rota usar.
              </p>
            </div>
            <Link href="/para-profissionais" className="inline-flex">
              <Button type="button" variant="secondary">Ver comparação completa</Button>
            </Link>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Link href="/realtor/register" className="group rounded-[24px] border border-indigo-200 bg-indigo-50/50 p-5 transition hover:border-indigo-300 hover:bg-white">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-indigo-700 shadow-sm">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div className="mt-4 text-lg font-semibold text-neutral-950">Ativar perfil de corretor</div>
              <p className="mt-2 text-sm leading-7 text-neutral-600">
                Ideal para atuação individual, inclusive quando você trabalha vinculado a uma imobiliária mas continua operando como pessoa corretora.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 group-hover:text-indigo-800">
                Começar como corretor
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
            <Link href="/agency/register" className="group rounded-[24px] border border-slate-200 bg-slate-50 p-5 transition hover:border-slate-300 hover:bg-white">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-800 shadow-sm">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="mt-4 text-lg font-semibold text-neutral-950">Cadastrar minha imobiliária</div>
              <p className="mt-2 text-sm leading-7 text-neutral-600">
                Use quando esta conta precisa representar a empresa, abrir o workspace do time e operar como agência com CNPJ próprio.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                Abrir workspace da imobiliária
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm shadow-black/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-neutral-950">{checklistTitle}</div>
              <p className="mt-1 text-sm text-neutral-600">{checklistDescription}</p>
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
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

        <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm shadow-black/5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-950">
                <Bell className="h-4 w-4 text-teal-700" />
                Newsletter semanal
              </div>
              <p className="mt-2 text-sm text-neutral-600">
                Um único resumo por semana, sem escolher cidade manualmente. O contexto vai sendo ajustado com base nas buscas que você faz por imóveis.
              </p>
            </div>
            <StatusBadge tone={newsletterEnabled ? "success" : "neutral"} label={newsletterEnabled ? "Ativa" : "Desligada"} />
          </div>

          <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-neutral-950">Receber newsletter semanal</div>
                <p className="mt-1 text-sm leading-6 text-neutral-600">
                  {newsletterEmail || profile.email || "Seu e-mail principal"} recebe um resumo semanal com oportunidades e contexto inferido do seu comportamento dentro da plataforma.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={newsletterEnabled}
                onClick={() => void handleNewsletterToggle()}
                disabled={newsletterLoading || newsletterSaving}
                className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition ${
                  newsletterEnabled ? "border-teal-700 bg-teal-700" : "border-neutral-300 bg-neutral-300"
                } ${(newsletterLoading || newsletterSaving) ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
              >
                <span
                  className={`inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${newsletterEnabled ? "translate-x-7" : "translate-x-1"}`}
                />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                {newsletterLoading ? "Carregando preferência" : `Última atualização: ${formatNewsletterUpdatedAt(newsletterUpdatedAt)}`}
              </div>
              {newsletterSaving ? (
                <div className="inline-flex items-center gap-2 text-sm font-medium text-teal-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </div>
              ) : null}
            </div>

            {newsletterError ? <p className="mt-3 text-sm text-red-600">{newsletterError}</p> : null}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
