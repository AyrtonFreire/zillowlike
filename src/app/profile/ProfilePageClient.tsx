"use client";

import { Loader2, RefreshCw, Save } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PhoneVerificationModal from "@/components/PhoneVerificationModal";
import EmailChangeModal from "@/components/EmailChangeModal";
import RecoveryEmailModal from "@/components/RecoveryEmailModal";
import SetPasswordModal from "@/components/SetPasswordModal";
import BackupCodesModal from "@/components/BackupCodesModal";
import EmptyState from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { ProfileIdentitySection } from "./components/ProfileIdentitySection";
import { InlineFeedbackBanner } from "./components/ProfilePrimitives";
import { ProfilePublicProfileSection } from "./components/ProfilePublicProfileSection";
import { ProfileQuickLinksSection } from "./components/ProfileQuickLinksSection";
import { ProfileSecuritySection } from "./components/ProfileSecuritySection";
import { ProfileSummaryCard } from "./components/ProfileSummaryCard";
import { useProfile } from "./useProfile";

export default function ProfilePageClient() {
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
    refreshAfterModal,
    handlePhoneLocalChange,
    dismissInlineFeedback,
  } = useProfile();

  const layoutActions = profile ? (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
      <div className="text-sm text-white/85">{hasChanges ? "Você tem alterações não salvas" : "Tudo salvo"}</div>
      <Button
        type="button"
        variant="secondary"
        leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        onClick={() => void saveProfile()}
        disabled={!hasChanges || saving}
        className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:border-white/30"
      >
        {saving ? "Salvando..." : "Salvar alterações"}
      </Button>
    </div>
  ) : null;

  if (loading && !profile) {
    return (
      <DashboardLayout
        title="Meu Perfil"
        description="Gerencie suas informações, segurança e presença pública."
        breadcrumbs={[{ label: "Dashboard", href: "/account" }, { label: "Meu Perfil" }]}
      >
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-neutral-200 bg-white px-6 py-16 shadow-sm shadow-black/5">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-teal-700" />
              <div>
                <h2 className="text-lg font-semibold text-neutral-950">Carregando seu perfil</h2>
                <p className="mt-2 text-sm text-neutral-600">Estamos buscando seus dados, verificações e preferências públicas.</p>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loadError && !profile) {
    return (
      <DashboardLayout
        title="Meu Perfil"
        description="Gerencie suas informações, segurança e presença pública."
        breadcrumbs={[{ label: "Dashboard", href: "/account" }, { label: "Meu Perfil" }]}
      >
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-neutral-200 bg-white px-6 py-8 shadow-sm shadow-black/5">
            <EmptyState
              title="Não foi possível carregar seu perfil"
              description={loadError}
              action={
                <Button type="button" variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void loadProfile()}>
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
      <DashboardLayout
        title="Meu Perfil"
        description="Gerencie suas informações, segurança e presença pública."
        breadcrumbs={[{ label: "Dashboard", href: "/account" }, { label: "Meu Perfil" }]}
      >
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-neutral-200 bg-white px-6 py-8 shadow-sm shadow-black/5">
            <EmptyState
              title="Seu perfil não está disponível agora"
              description="Tente recarregar a página em instantes para continuar editando seus dados."
              action={
                <Button type="button" variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void loadProfile()}>
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
      title="Meu Perfil"
      description="Gerencie sua identidade, segurança, perfil público e atalhos operacionais em um só lugar."
      breadcrumbs={[{ label: "Dashboard", href: "/account" }, { label: "Meu Perfil" }]}
      actions={layoutActions}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6">
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

          <ProfileSummaryCard
            profile={profile}
            publicUrl={publicUrl}
            uploadingAvatar={uploadingAvatar}
            onUploadAvatar={uploadAvatar}
          />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
            <div className="grid gap-6">
              <ProfileIdentitySection profile={profile} form={form} fieldErrors={fieldErrors} onFieldChange={setField} />
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
            </div>

            <div className="grid gap-6">
              <ProfileSecuritySection
                profile={profile}
                onOpenEmail={() => openModal("email")}
                onOpenPhone={openPhoneModal}
                onOpenRecoveryEmail={() => openModal("recoveryEmail")}
                onOpenPassword={() => openModal("setPassword")}
                onOpenBackupCodes={() => openModal("backupCodes")}
              />
              <ProfileQuickLinksSection role={profile.role} />
            </div>
          </div>
        </div>
      </div>

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
    </DashboardLayout>
  );
}
