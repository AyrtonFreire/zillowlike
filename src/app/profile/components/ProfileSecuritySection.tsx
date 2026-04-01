"use client";

import { KeyRound, Mail, MessageSquareMore, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { UserProfile } from "../types";
import { SectionCard, SettingRow, StatusBadge } from "./ProfilePrimitives";

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
            <Button type="button" variant="secondary" leftIcon={<Mail className="h-4 w-4" />} onClick={onOpenEmail}>
              {profile.emailVerified ? "Alterar e-mail" : "Verificar e-mail"}
            </Button>
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
            <Button type="button" variant="secondary" leftIcon={<Smartphone className="h-4 w-4" />} onClick={onOpenPhone}>
              {profile.phone ? (profile.phoneVerifiedAt ? "Alterar telefone" : "Verificar telefone") : "Adicionar telefone"}
            </Button>
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
            <Button type="button" variant="secondary" leftIcon={<MessageSquareMore className="h-4 w-4" />} onClick={onOpenRecoveryEmail}>
              {profile.recoveryEmail ? "Gerenciar recuperação" : "Adicionar recuperação"}
            </Button>
          }
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <SettingRow
            title="Senha"
            value={profile.hasPassword ? "Senha configurada" : "Crie uma senha de acesso"}
            description="Defina uma senha local para ter redundância além do provedor atual de autenticação."
            status={profile.hasPassword ? <StatusBadge label="Protegido" tone="success" /> : <StatusBadge label="Recomendado" tone="warning" />}
            action={
              <Button type="button" variant="secondary" leftIcon={<KeyRound className="h-4 w-4" />} onClick={onOpenPassword}>
                {profile.hasPassword ? "Alterar senha" : "Criar senha"}
              </Button>
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
              <Button type="button" variant="secondary" leftIcon={<ShieldCheck className="h-4 w-4" />} onClick={onOpenBackupCodes}>
                {backupCodes.total > 0 ? "Regenerar códigos" : "Gerar códigos"}
              </Button>
            }
          />
        </div>
      </div>
    </SectionCard>
  );
}
