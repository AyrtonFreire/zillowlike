"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/contexts/ToastContext";
import {
  areProfileFormsEqual,
  buildProfileForm,
  getPublicProfilePath,
  normalizeProfileForm,
  type InlineFeedback,
  type ProfileFieldErrors,
  type ProfileFormState,
  type UserProfile,
} from "./types";

type ModalState = {
  phone: boolean;
  email: boolean;
  recoveryEmail: boolean;
  setPassword: boolean;
  backupCodes: boolean;
};

const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const AVATAR_MAX_SIZE_BYTES = 10 * 1024 * 1024;
const AVATAR_MAX_SIDE = 2560;

function sanitizeEditableForm(profile?: UserProfile | null): ProfileFormState {
  const form = buildProfileForm(profile);
  if (!profile?.phone || !profile?.phoneVerifiedAt) {
    form.publicPhoneOptIn = false;
  }
  return form;
}

async function readJson(response: Response) {
  return response.json().catch(() => null);
}

async function processAvatarFile(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = document.createElement("img");
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = objectUrl;
    });

    const width = image.naturalWidth || 0;
    const height = image.naturalHeight || 0;

    if (!width || !height) {
      return file;
    }

    const scale = Math.min(1, AVATAR_MAX_SIDE / Math.max(width, height));
    const targetWidth = Math.round(width * scale);
    const targetHeight = Math.round(height * scale);

    if (scale === 1 && file.type === "image/webp" && file.size <= AVATAR_MAX_SIZE_BYTES) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((next) => {
        if (next) {
          resolve(next);
          return;
        }
        reject(new Error("Não foi possível processar a imagem."));
      }, "image/webp", 0.82);
    });

    return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function uploadAvatarAsset(file: File) {
  const signatureResponse = await fetch("/api/upload/cloudinary-sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder: "zillowlike/avatars" }),
  });

  const signaturePayload = await readJson(signatureResponse);

  if (!signatureResponse.ok || !signaturePayload?.signature) {
    throw new Error(signaturePayload?.error || "Não foi possível iniciar o upload do avatar.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", String(signaturePayload.apiKey));
  formData.append("timestamp", String(signaturePayload.timestamp));
  formData.append("signature", String(signaturePayload.signature));
  formData.append("folder", String(signaturePayload.folder));

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${signaturePayload.cloudName}/image/upload`,
    { method: "POST", body: formData }
  );

  const uploadPayload = await readJson(uploadResponse);

  if (!uploadResponse.ok || !uploadPayload?.secure_url) {
    throw new Error(uploadPayload?.error?.message || "Falha ao enviar a imagem para o storage.");
  }

  return String(uploadPayload.secure_url);
}

export function useProfile() {
  const router = useRouter();
  const toast = useToast();
  const { status, update } = useSession();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<ProfileFormState>(() => sanitizeEditableForm(null));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [inlineFeedback, setInlineFeedback] = useState<InlineFeedback>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [modals, setModals] = useState<ModalState>({
    phone: false,
    email: false,
    recoveryEmail: false,
    setPassword: false,
    backupCodes: false,
  });
  const [phoneModalStartInEdit, setPhoneModalStartInEdit] = useState(false);

  const applyProfile = useCallback((nextProfile: UserProfile) => {
    setProfile(nextProfile);
    setForm(sanitizeEditableForm(nextProfile));
    setLoadError(null);
    setSaveError(null);
    setFieldErrors({});
  }, []);

  const loadProfile = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }
      setLoadError(null);

      try {
        const response = await fetch("/api/user/profile", { cache: "no-store" });
        const payload = await readJson(response);

        if (!response.ok || !payload?.success || !payload?.user) {
          throw new Error(payload?.error || "Não foi possível carregar seu perfil agora.");
        }

        applyProfile(payload.user as UserProfile);
        return payload.user as UserProfile;
      } catch (error: any) {
        const message = error?.message || "Não foi possível carregar seu perfil agora.";
        setLoadError(message);
        if (!options?.silent) {
          setInlineFeedback({
            kind: "error",
            title: "Falha ao carregar seu perfil",
            message,
          });
        }
        return null;
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [applyProfile]
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
      return;
    }

    if (status === "authenticated") {
      void loadProfile();
      return;
    }

    setLoading(true);
  }, [loadProfile, router, status]);

  const initialForm = useMemo(() => sanitizeEditableForm(profile), [profile]);
  const hasVerifiedPhone = useMemo(() => Boolean(profile?.phone && profile.phoneVerifiedAt), [profile]);
  const normalizedDraft = useMemo(
    () =>
      normalizeProfileForm({
        ...form,
        publicPhoneOptIn: hasVerifiedPhone ? form.publicPhoneOptIn : false,
      }),
    [form, hasVerifiedPhone]
  );
  const hasChanges = useMemo(() => !areProfileFormsEqual(initialForm, normalizedDraft), [initialForm, normalizedDraft]);
  const isRealtorOrAgency = useMemo(() => profile?.role === "REALTOR" || profile?.role === "AGENCY", [profile?.role]);
  const publicPath = useMemo(() => getPublicProfilePath(profile), [profile]);
  const publicUrl = useMemo(() => {
    if (!publicPath) return null;

    const siteUrl =
      (typeof window !== "undefined" && window.location.origin) ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3001";

    return `${siteUrl.replace(/\/$/, "")}${publicPath}`;
  }, [publicPath]);

  const setField = useCallback(
    <K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) => {
      setForm((current) => {
        const nextValue = field === "publicState" ? String(value).toUpperCase().slice(0, 2) : value;
        return { ...current, [field]: nextValue };
      });
      setFieldErrors((current) => ({ ...current, [field]: undefined, general: undefined }));
      setSaveError(null);
      setInlineFeedback((current) => (current?.kind === "error" ? null : current));
    },
    []
  );

  const openModal = useCallback((key: keyof ModalState) => {
    setModals((current) => ({ ...current, [key]: true }));
  }, []);

  const closeModal = useCallback((key: keyof ModalState) => {
    setModals((current) => ({ ...current, [key]: false }));
  }, []);

  const openPhoneModal = useCallback(() => {
    const hasPhone = Boolean((profile?.phone || "").trim());
    const isVerified = Boolean(profile?.phoneVerifiedAt);
    setPhoneModalStartInEdit(!hasPhone || isVerified);
    setModals((current) => ({ ...current, phone: true }));
  }, [profile?.phone, profile?.phoneVerifiedAt]);

  const saveProfile = useCallback(async () => {
    if (!profile || saving) return false;

    setSaving(true);
    setSaveError(null);
    setFieldErrors({});
    setInlineFeedback(null);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedDraft),
      });

      const payload = await readJson(response);

      if (!response.ok || !payload?.user) {
        const nextFieldErrors = payload?.fields || {};
        const firstMessage = payload?.error || "Não foi possível salvar suas alterações.";
        setFieldErrors({
          name: nextFieldErrors?.name?.[0],
          publicHeadline: nextFieldErrors?.publicHeadline?.[0],
          publicBio: nextFieldErrors?.publicBio?.[0],
          publicCity: nextFieldErrors?.publicCity?.[0],
          publicState: nextFieldErrors?.publicState?.[0],
          general: firstMessage,
        });
        setSaveError(firstMessage);
        setInlineFeedback({ kind: "error", title: "Não foi possível salvar", message: firstMessage });
        toast.error("Não foi possível salvar", firstMessage);
        return false;
      }

      applyProfile(payload.user as UserProfile);
      await update();
      setInlineFeedback({
        kind: "success",
        title: "Perfil atualizado",
        message: "Suas alterações foram salvas e já estão ativas.",
      });
      toast.success("Perfil atualizado", "Suas alterações foram salvas com sucesso.");
      return true;
    } catch (error: any) {
      const message = error?.message || "Não foi possível salvar suas alterações.";
      setSaveError(message);
      setFieldErrors((current) => ({ ...current, general: message }));
      setInlineFeedback({ kind: "error", title: "Não foi possível salvar", message });
      toast.error("Não foi possível salvar", message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [applyProfile, normalizedDraft, profile, saving, toast, update]);

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (uploadingAvatar) return false;

      if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
        const message = "Envie uma imagem JPG, PNG ou WEBP para o avatar.";
        setInlineFeedback({ kind: "error", title: "Formato não suportado", message });
        toast.error("Formato não suportado", message);
        return false;
      }

      setUploadingAvatar(true);
      setSaveError(null);
      setInlineFeedback(null);

      try {
        let uploadFile = file;

        if (file.size > AVATAR_MAX_SIZE_BYTES || file.type !== "image/webp") {
          try {
            uploadFile = await processAvatarFile(file);
          } catch {
            toast.info("Não foi possível otimizar a imagem", "Vamos tentar enviar o arquivo original.");
          }
        }

        if (uploadFile.size > AVATAR_MAX_SIZE_BYTES) {
          throw new Error("A imagem final precisa ter até 10 MB.");
        }

        const imageUrl = await uploadAvatarAsset(uploadFile);
        const response = await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: imageUrl }),
        });
        const payload = await readJson(response);

        if (!response.ok || !payload?.user) {
          throw new Error(payload?.error || "Não foi possível atualizar seu avatar.");
        }

        applyProfile(payload.user as UserProfile);
        await update();
        setInlineFeedback({
          kind: "success",
          title: "Avatar atualizado",
          message: "Sua nova foto já aparece no seu perfil.",
        });
        toast.success("Avatar atualizado", "Sua nova foto já aparece no perfil.");
        return true;
      } catch (error: any) {
        const message = error?.message || "Não foi possível atualizar seu avatar.";
        setInlineFeedback({ kind: "error", title: "Falha no upload do avatar", message });
        toast.error("Falha no upload do avatar", message);
        return false;
      } finally {
        setUploadingAvatar(false);
      }
    },
    [applyProfile, toast, update, uploadingAvatar]
  );

  const refreshAfterModal = useCallback(
    async (successFeedback?: { title: string; message?: string }) => {
      await loadProfile({ silent: true });
      await update();
      if (successFeedback) {
        setInlineFeedback({ kind: "success", title: successFeedback.title, message: successFeedback.message });
      }
    },
    [loadProfile, update]
  );

  const handlePhoneLocalChange = useCallback((newPhone: string) => {
    setProfile((current) =>
      current
        ? {
            ...current,
            phone: newPhone,
            phoneVerifiedAt: null,
            publicPhoneOptIn: false,
          }
        : current
    );
    setForm((current) => ({ ...current, publicPhoneOptIn: false }));
  }, []);

  const copyPublicLink = useCallback(async () => {
    if (!publicUrl) return false;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link copiado", "Você pode compartilhar seu perfil público agora.");
      return true;
    } catch {
      toast.error("Não foi possível copiar", "Seu navegador bloqueou o acesso à área de transferência neste momento.");
      return false;
    }
  }, [publicUrl, toast]);

  const dismissInlineFeedback = useCallback(() => {
    setInlineFeedback(null);
    setSaveError(null);
    setFieldErrors((current) => ({ ...current, general: undefined }));
  }, []);

  return {
    status,
    profile,
    form,
    loading,
    loadError,
    saving,
    saveError,
    fieldErrors,
    inlineFeedback,
    uploadingAvatar,
    modals,
    phoneModalStartInEdit,
    isRealtorOrAgency,
    hasVerifiedPhone,
    hasChanges,
    publicPath,
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
  };
}
