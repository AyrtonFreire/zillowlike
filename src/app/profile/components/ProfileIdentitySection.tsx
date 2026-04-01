"use client";

import Input from "@/components/ui/Input";
import { formatRoleLabel, type ProfileFieldErrors, type ProfileFormState, type UserProfile } from "../types";
import { SectionCard, SettingRow, StatusBadge } from "./ProfilePrimitives";

export function ProfileIdentitySection({
  profile,
  form,
  fieldErrors,
  onFieldChange,
}: {
  profile: UserProfile;
  form: ProfileFormState;
  fieldErrors: ProfileFieldErrors;
  onFieldChange: <K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) => void;
}) {
  return (
    <SectionCard
      eyebrow="Dados da conta"
      title="Identidade da conta"
      description="Esses dados aparecem na plataforma e ajudam a manter confiança, rastreabilidade e consistência com seu perfil público."
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <Input
          label="Nome completo"
          value={form.name}
          onChange={(event) => onFieldChange("name", event.target.value)}
          error={fieldErrors.name}
          maxLength={120}
          placeholder="Como você quer ser identificado(a)"
        />

        <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-neutral-950">Tipo de conta</div>
            <StatusBadge label={formatRoleLabel(profile.role)} tone="info" />
          </div>
          <p className="mt-2 text-sm text-neutral-600">
            O papel da conta define quais áreas você vê na plataforma e qual rota pública será usada ao publicar seu perfil.
          </p>
        </div>
      </div>

      <SettingRow
        title="Slug público"
        value={profile.publicSlug || "Será gerado quando seu perfil público estiver pronto"}
        description="Usamos esse identificador no link público. Ele acompanha a rota certa para corretor, agência ou anunciante." 
        status={profile.publicSlug ? <StatusBadge label="Pronto para compartilhar" tone="success" /> : <StatusBadge label="Ainda não disponível" tone="warning" />}
      />
    </SectionCard>
  );
}
