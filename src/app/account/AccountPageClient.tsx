"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BriefcaseBusiness,
  LayoutGrid,
  Loader2,
  LogOut,
  Shield,
  UserRound,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import AccountReauthModal from "@/components/AccountReauthModal";
import BackupCodesModal from "@/components/BackupCodesModal";
import EmailChangeModal from "@/components/EmailChangeModal";
import PhoneVerificationModal from "@/components/PhoneVerificationModal";
import RecoveryEmailModal from "@/components/RecoveryEmailModal";
import SetPasswordModal from "@/components/SetPasswordModal";
import EmptyState from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { InlineFeedbackBanner } from "@/app/profile/components/ProfilePrimitives";
import { ProfileIdentitySection } from "@/app/profile/components/ProfileIdentitySection";
import { ProfilePublicProfileSection } from "@/app/profile/components/ProfilePublicProfileSection";
import { ProfileSecuritySection } from "@/app/profile/components/ProfileSecuritySection";
import { useProfile } from "@/app/profile/useProfile";
import { type UserProfile } from "@/app/profile/types";
import { AccountOverviewSection } from "./components/AccountOverviewSection";
import { type AccountSettingsNavItem, AccountSettingsSidebar } from "./components/AccountSettingsSidebar";
import { AccountSecuritySection } from "./components/AccountSecuritySection";
import { ACCOUNT_SETTINGS_SECTIONS, isAccountSettingsSectionId, type AccountSettingsSectionId } from "./settings-sections";

function getDashboardHref(profile?: UserProfile | null) {
  switch (profile?.role) {
    case "REALTOR":
    case "AGENCY":
      return "/broker/dashboard";
    case "OWNER":
      return "/owner/dashboard";
    case "ADMIN":
      return "/admin";
    default:
      return "/account";
  }
}

function getRoleCopy(profile?: UserProfile | null) {
  if (profile?.role === "REALTOR" || profile?.role === "AGENCY") {
    return {
      title: "Configurações do corretor",
      description: "Conta, perfil profissional, segurança e newsletter semanal em um só lugar, com navegação simples e direta.",
    };
  }

  return {
    title: "Configurações da conta",
    description: "Revise perfil, acesso, segurança e newsletter semanal em uma única experiência.",
  };
}

export default function AccountPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    profile,
    form,
    loading,
    loadError,
    saving,
    fieldErrors,
    inlineFeedback,
    uploadingAvatar,
    modals,
    reauth,
    phoneModalStartInEdit,
    hasVerifiedPhone,
    hasChanges,
    publicUrl,
    setField,
    loadProfile,
    saveProfile,
    uploadAvatar,
    copyPublicLink,
    openModal,
    closeModal,
    openPhoneModal,
    closeReauthModal,
    handleReauthSuccess,
    refreshAfterModal,
    handlePhoneLocalChange,
    dismissInlineFeedback,
  } = useProfile();

  const rawSection = searchParams.get("section");
  const activeSection: AccountSettingsSectionId = isAccountSettingsSectionId(rawSection) ? rawSection : "overview";
  const brokerOnboarding = searchParams.get("onboarding") === "broker";

  const setActiveSection = useCallback(
    (section: AccountSettingsSectionId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("section", section);
      router.replace(`${pathname || "/account"}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const roleCopy = useMemo(() => getRoleCopy(profile), [profile]);
  const breadcrumbs = useMemo(() => {
    const homeHref = getDashboardHref(profile);
    return [{ label: homeHref === "/account" ? "Conta" : "Dashboard", href: homeHref }, { label: roleCopy.title }];
  }, [profile, roleCopy.title]);

  const checklist = useMemo(() => {
    if (!profile) return { done: 0, total: 6, label: "Carregando progresso" };
    const items = [
      Boolean(String(profile.name || "").trim()),
      Boolean(profile.image),
      Boolean(profile.phoneVerifiedAt),
      Boolean(String(profile.publicHeadline || "").trim()),
      Boolean(String(profile.publicBio || "").trim()),
      Boolean(Array.isArray(profile.publicServiceAreas) && profile.publicServiceAreas.length > 0),
      Boolean(profile.recoveryEmailVerifiedAt || profile.hasPassword),
    ];
    const done = items.filter(Boolean).length;
    return {
      done,
      total: items.length,
      label: done === items.length ? "Tudo essencial está pronto." : `${items.length - done} ajuste(s) ainda ajudam a deixar a conta mais clara e segura.`,
    };
  }, [profile]);

  const navItems = useMemo<AccountSettingsNavItem[]>(() => {
    const profileReady = Boolean(profile?.name && String(profile.name).trim().length > 0);
    const publicReady = Boolean(
      profile &&
        String(profile.publicHeadline || "").trim() &&
        String(profile.publicBio || "").trim() &&
        String(profile.publicCity || "").trim() &&
        String(profile.publicState || "").trim().length === 2
    );
    const accessReady = Boolean(profile?.emailVerified && (profile?.phoneVerifiedAt || profile?.hasPassword || profile?.recoveryEmailVerifiedAt));
    const securityReady = Boolean((profile?.backupCodes?.unused || 0) > 0 || profile?.hasPassword || profile?.recoveryEmailVerifiedAt);

    return [
      {
        id: "overview",
        label: "Visão geral",
        description: "Veja progresso, pendências e o que vale ajustar primeiro.",
        icon: <LayoutGrid className="h-4 w-4" />,
      },
      {
        id: "professional",
        label: "Perfil profissional",
        description: "Nome, identidade da conta e base do seu posicionamento.",
        icon: <UserRound className="h-4 w-4" />,
        statusLabel: profileReady ? "Ok" : "Revise",
        statusTone: profileReady ? "success" : "warning",
      },
      {
        id: "public",
        label: "Apresentação pública",
        description: "Headline, bio, contato e prévia do perfil público.",
        icon: <BriefcaseBusiness className="h-4 w-4" />,
        statusLabel: publicReady ? "Pronto" : "Pendente",
        statusTone: publicReady ? "success" : "warning",
      },
      {
        id: "access",
        label: "Conta e acesso",
        description: "E-mail, telefone, recuperação, senha e backup.",
        icon: <Shield className="h-4 w-4" />,
        statusLabel: accessReady ? "Estável" : "Atenção",
        statusTone: accessReady ? "success" : "warning",
      },
      {
        id: "security",
        label: "Sessões e segurança",
        description: "Score de proteção, sessões ativas e atividade recente.",
        icon: <Shield className="h-4 w-4" />,
        statusLabel: securityReady ? "Bom" : "Reforçar",
        statusTone: securityReady ? "success" : "warning",
      },
    ];
  }, [profile]);

  const layoutActions = profile ? (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
      <div className="text-sm text-white/85">{hasChanges ? "Você tem alterações não salvas" : "Tudo salvo"}</div>
      <Button
        type="button"
        variant="secondary"
        leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
        onClick={() => void saveProfile()}
        disabled={!hasChanges || saving}
        className="border-white/70 bg-white text-teal-950 hover:border-white hover:bg-white disabled:border-white/35 disabled:bg-white/15 disabled:text-white/80 disabled:opacity-100"
      >
        {saving ? "Salvando..." : "Salvar alterações"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        leftIcon={<LogOut className="h-4 w-4" />}
        onClick={() => signOut({ callbackUrl: "/" })}
        className="border-white/35 bg-white/10 text-white hover:bg-white/16 hover:border-white/60"
      >
        Sair
      </Button>
    </div>
  ) : null;

  const renderSection = () => {
    if (!profile) return null;

    switch (activeSection) {
      case "overview":
        return (
          <AccountOverviewSection
            profile={profile}
            publicUrl={publicUrl}
            uploadingAvatar={uploadingAvatar}
            onUploadAvatar={uploadAvatar}
            onGoToSection={(id) => {
              if (isAccountSettingsSectionId(id)) setActiveSection(id);
            }}
            navItems={navItems}
          />
        );
      case "professional":
        return <ProfileIdentitySection profile={profile} form={form} fieldErrors={fieldErrors} onFieldChange={setField} />;
      case "public":
        return (
          <ProfilePublicProfileSection
            profile={profile}
            form={form}
            fieldErrors={fieldErrors}
            hasVerifiedPhone={hasVerifiedPhone}
            publicUrl={publicUrl}
            saving={saving}
            onFieldChange={setField}
            onCopyLink={copyPublicLink}
          />
        );
      case "access":
        return (
          <ProfileSecuritySection
            profile={profile}
            onOpenEmail={() => openModal("email")}
            onOpenPhone={openPhoneModal}
            onOpenRecoveryEmail={() => openModal("recoveryEmail")}
            onOpenPassword={() => openModal("setPassword")}
            onOpenBackupCodes={() => openModal("backupCodes")}
            showSecurityCenterLink={false}
          />
        );
      case "security":
        return <AccountSecuritySection />;
      default:
        return null;
    }
  };

  if (loading && !profile) {
    return (
      <DashboardLayout title={roleCopy.title} description={roleCopy.description} breadcrumbs={breadcrumbs}>
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-neutral-200 bg-white px-6 py-16 shadow-sm shadow-black/5">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-teal-700" />
              <div>
                <h2 className="text-lg font-semibold text-neutral-950">Carregando suas configurações</h2>
                <p className="mt-2 text-sm text-neutral-600">Estamos juntando conta, perfil, segurança e newsletter semanal em uma única visão.</p>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loadError && !profile) {
    return (
      <DashboardLayout title={roleCopy.title} description={roleCopy.description} breadcrumbs={breadcrumbs}>
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-neutral-200 bg-white px-6 py-8 shadow-sm shadow-black/5">
            <EmptyState
              title="Não foi possível carregar suas configurações"
              description={loadError}
              action={
                <Button type="button" variant="secondary" onClick={() => void loadProfile()}>
                  Tentar novamente
                </Button>
              }
            />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout title={roleCopy.title} description={roleCopy.description} breadcrumbs={breadcrumbs}>
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-neutral-200 bg-white px-6 py-8 shadow-sm shadow-black/5">
            <EmptyState
              title="Seu perfil não está disponível agora"
              description="Tente recarregar a página em instantes para continuar configurando sua conta."
              action={
                <Button type="button" variant="secondary" onClick={() => void loadProfile()}>
                  Recarregar perfil
                </Button>
              }
            />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={roleCopy.title}
      description={roleCopy.description}
      breadcrumbs={breadcrumbs}
      actions={layoutActions}
    >
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <AccountSettingsSidebar
            name={profile.name}
            email={profile.email}
            image={profile.image}
            progress={checklist}
            items={navItems}
            activeId={activeSection}
            onSelect={(id) => {
              if (isAccountSettingsSectionId(id)) setActiveSection(id);
            }}
          />

          <div className="min-w-0 space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {ACCOUNT_SETTINGS_SECTIONS.map((section) => {
                const item = navItems.find((entry) => entry.id === section);
                if (!item) return null;
                const active = activeSection === section;
                return (
                  <button
                    key={section}
                    type="button"
                    onClick={() => setActiveSection(section)}
                    className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      active ? "border-teal-200 bg-teal-50 text-teal-900" : "border-neutral-200 bg-white text-neutral-700"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {brokerOnboarding ? (
              <InlineFeedbackBanner
                tone="info"
                title="Agora suas configurações ficam em um lugar só"
                message="Perfil profissional, segurança e newsletter semanal foram organizados por seções para facilitar o onboarding do corretor."
              />
            ) : null}

            {inlineFeedback ? (
              <InlineFeedbackBanner
                tone={inlineFeedback.kind}
                title={inlineFeedback.title}
                message={inlineFeedback.message}
                onDismiss={dismissInlineFeedback}
              />
            ) : null}

            {fieldErrors.general && !inlineFeedback ? (
              <InlineFeedbackBanner tone="error" title="Revise os dados antes de salvar" message={fieldErrors.general} onDismiss={dismissInlineFeedback} />
            ) : null}

            {renderSection()}
          </div>
        </div>
      </div>

      {hasChanges ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl rounded-2xl border border-neutral-200 bg-white/95 p-4 shadow-2xl shadow-black/10 backdrop-blur pointer-events-auto">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-neutral-950">Você tem alterações não salvas</div>
                <p className="mt-1 text-sm text-neutral-600">Salve ou descarte antes de sair desta área.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="secondary" onClick={() => void loadProfile({ silent: true })} disabled={saving}>
                  Descartar
                </Button>
                <Button type="button" onClick={() => void saveProfile()} disabled={saving} leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}>
                  {saving ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <PhoneVerificationModal
        isOpen={modals.phone}
        onClose={() => closeModal("phone")}
        onVerified={async () => {
          await refreshAfterModal({ title: "Telefone verificado", message: "Seu telefone já pode ser usado nas áreas públicas permitidas." });
        }}
        phone={String(profile.phone || "")}
        allowEdit
        startInEdit={phoneModalStartInEdit}
        onPhoneChange={handlePhoneLocalChange}
      />

      <EmailChangeModal
        isOpen={modals.email}
        onClose={() => closeModal("email")}
        currentEmail={String(profile.email || "")}
        onVerified={async () => {
          await refreshAfterModal({ title: "E-mail atualizado", message: "Seu e-mail principal foi confirmado com sucesso." });
        }}
      />

      <RecoveryEmailModal
        isOpen={modals.recoveryEmail}
        onClose={() => closeModal("recoveryEmail")}
        currentRecoveryEmail={profile.recoveryEmail || null}
        onVerified={async () => {
          await refreshAfterModal({ title: "Recuperação atualizada", message: "Seu e-mail de recuperação está pronto para uso." });
        }}
      />

      <SetPasswordModal
        isOpen={modals.setPassword}
        onClose={() => closeModal("setPassword")}
        onSuccess={async () => {
          await refreshAfterModal({ title: "Senha atualizada", message: "Sua conta agora tem uma senha local configurada." });
        }}
      />

      <BackupCodesModal
        isOpen={modals.backupCodes}
        onClose={() => closeModal("backupCodes")}
        onGenerated={async () => {
          await refreshAfterModal({ title: "Códigos gerados", message: "Guarde os códigos em um local seguro para usar quando necessário." });
        }}
      />

      <AccountReauthModal
        isOpen={reauth.open}
        onClose={closeReauthModal}
        onSuccess={handleReauthSuccess}
        actionLabel={reauth.actionLabel}
        email={reauth.email}
        hasPassword={reauth.hasPassword}
      />
    </DashboardLayout>
  );
}
