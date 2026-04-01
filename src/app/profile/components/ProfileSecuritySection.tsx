"use client";

import type { ReactNode } from "react";
import { ArrowRight, KeyRound, Mail, MessageSquareMore, ShieldCheck, Smartphone } from "lucide-react";
import type { UserProfile } from "../types";
import { SectionCard, SettingRow, StatusBadge } from "./ProfilePrimitives";

function ActionButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex min-h-[56px] w-full items-center justify-between gap-3 rounded-2xl border border-neutral-200/90 bg-gradient-to-b from-white via-white to-neutral-50/90 px-3.5 py-3 text-left text-neutral-900 shadow-sm shadow-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md hover:shadow-teal-100/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/20 focus-visible:ring-offset-2 sm:w-auto sm:min-w-[240px]"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-gradient-to-br from-neutral-50 to-white text-neutral-600 shadow-sm transition-colors group-hover:border-teal-200 group-hover:text-teal-700">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold tracking-[0.01em]">{label}</span>
        </span>
      </span>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 transition-all group-hover:bg-teal-50 group-hover:text-teal-700">
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

export function ProfileSecuritySection({
  profile,
  onOpenEmail,
  onOpenPhone,
  onOpenRecoveryEmail,
  onOpenPassword,
  onOpenBackupCodes,
}: {
  profile: UserProfile;
  onOpenEmail: () => void;
  onOpenPhone: () => void;
  onOpenRecoveryEmail: () => void;
  onOpenPassword: () => void;
  onOpenBackupCodes: () => void;
}) {
  const backupCodes = profile.backupCodes || { total: 0, unused: 0 };

  return (
    <SectionCard
      eyebrow="Contato e acesso"
      title="Segurança e recuperação"
      description="Centralize verificação, recuperação e proteção da conta sem depender de alertas soltos ou etapas escondidas."
    >
      <div className="grid gap-4">
        <SettingRow
          title="E-mail principal"
          value={profile.email || "Não informado"}
          description="Usado para login, notificações transacionais e comunicações principais da plataforma."
          status={
            profile.emailVerified ? <StatusBadge label="Verificado" tone="success" /> : <StatusBadge label="Pendente" tone="warning" />
          }
          action={
            <ActionButton label={profile.emailVerified ? "Alterar e-mail" : "Verificar e-mail"} icon={<Mail className="h-[18px] w-[18px]" />} onClick={onOpenEmail} />
          }
        />

        <SettingRow
          title="Telefone"
          value={profile.phone || "Nenhum telefone cadastrado"}
          description="Necessário para publicar telefone no perfil, habilitar rotas de contato e reforçar a recuperação da conta."
          status={
            profile.phoneVerifiedAt ? (
              <StatusBadge label="Verificado" tone="success" />
            ) : profile.phone ? (
              <StatusBadge label="Aguardando verificação" tone="warning" />
            ) : (
              <StatusBadge label="Não configurado" tone="neutral" />
            )
          }
          action={
            <ActionButton
              label={profile.phone ? (profile.phoneVerifiedAt ? "Alterar telefone" : "Verificar telefone") : "Adicionar telefone"}
              icon={<Smartphone className="h-[18px] w-[18px]" />}
              onClick={onOpenPhone}
            />
          }
        />

        <SettingRow
          title="E-mail de recuperação"
          value={profile.recoveryEmail || "Nenhum e-mail de recuperação configurado"}
          description="Recebe códigos e avisos para retomada de acesso se você perder o e-mail principal."
          status={
            profile.recoveryEmailVerifiedAt ? (
              <StatusBadge label="Pronto para uso" tone="success" />
            ) : profile.recoveryEmail ? (
              <StatusBadge label="Aguardando confirmação" tone="warning" />
            ) : (
              <StatusBadge label="Opcional, mas recomendado" tone="info" />
            )
          }
          action={
            <ActionButton
              label={profile.recoveryEmail ? "Gerenciar recuperação" : "Adicionar recuperação"}
              icon={<MessageSquareMore className="h-[18px] w-[18px]" />}
              onClick={onOpenRecoveryEmail}
            />
          }
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <SettingRow
            title="Senha"
            value={profile.hasPassword ? "Senha configurada" : "Crie uma senha de acesso"}
            description="Defina uma senha local para ter redundância além do provedor atual de autenticação."
            status={profile.hasPassword ? <StatusBadge label="Protegido" tone="success" /> : <StatusBadge label="Recomendado" tone="warning" />}
            action={
              <ActionButton label={profile.hasPassword ? "Alterar senha" : "Criar senha"} icon={<KeyRound className="h-[18px] w-[18px]" />} onClick={onOpenPassword} />
            }
          />

          <SettingRow
            title="Códigos de backup"
            value={backupCodes.total > 0 ? `${backupCodes.unused} de ${backupCodes.total} disponíveis` : "Nenhum código gerado"}
            description="Guarde códigos de uso único para continuar entrando na conta mesmo sem acesso imediato aos fatores principais."
            status={
              backupCodes.unused > 0 ? <StatusBadge label="Cobertura disponível" tone="success" /> : <StatusBadge label="Gerar agora" tone="warning" />
            }
            action={
              <ActionButton
                label={backupCodes.total > 0 ? "Regenerar códigos" : "Gerar códigos"}
                icon={<ShieldCheck className="h-[18px] w-[18px]" />}
                onClick={onOpenBackupCodes}
              />
            }
          />
        </div>
      </div>
    </SectionCard>
  );
}
