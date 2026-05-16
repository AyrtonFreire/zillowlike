"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import {
  scoreBio,
  validateBio,
  validateHeadline,
  type ValidationResult,
} from "./validators";

export type WizardInitialProfile = {
  name: string;
  publicHeadline: string;
  publicBio: string;
  publicCity: string;
  publicState: string;
  publicServiceAreas: string[];
  publicWhatsApp: string;
  publicPhoneOptIn: boolean;
  publicInstagram: string;
  publicLinkedIn: string;
  hasVerifiedPhone: boolean;
  image: string | null;
  publicSlug: string | null;
  role: "REALTOR" | "AGENCY";
};

type WizardState = {
  publicHeadline: string;
  publicBio: string;
  publicCity: string;
  publicState: string;
  publicServiceAreas: string[];
  publicWhatsApp: string;
  publicPhoneOptIn: boolean;
  publicInstagram: string;
  publicLinkedIn: string;
};

type StepDefinition = {
  key: "headline" | "bio" | "location" | "contact" | "review";
  label: string;
  helper: string;
};

const STEPS_REALTOR: StepDefinition[] = [
  { key: "headline", label: "Posicionamento", helper: "Uma frase clara sobre o seu foco." },
  { key: "bio", label: "Bio narrativa", helper: "Conte quem você é e como atende." },
  { key: "location", label: "Localização", helper: "Cidade, UF e áreas atendidas." },
  { key: "contact", label: "Contato", helper: "WhatsApp e redes sociais." },
  { key: "review", label: "Revisão", helper: "Confira antes de publicar." },
];

const STEPS_AGENCY: StepDefinition[] = [
  { key: "headline", label: "Posicionamento", helper: "Uma frase clara sobre a agência." },
  { key: "bio", label: "Apresentação", helper: "Conte a história e o foco da agência." },
  { key: "location", label: "Localização", helper: "Cidade, UF e regiões cobertas." },
  { key: "contact", label: "Contato", helper: "WhatsApp e redes sociais." },
  { key: "review", label: "Revisão", helper: "Confira antes de publicar." },
];

function ValidationFeedback({ result }: { result: ValidationResult }) {
  if (!result.message) return null;
  const tone =
    result.level === "block"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : result.level === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-800";
  return (
    <div className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${tone}`}>
      <p>{result.message}</p>
      {result.suggestions.length > 0 ? (
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
          {result.suggestions.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function ProfilePublicWizardClient({
  initial,
}: {
  initial: WizardInitialProfile;
}) {
  const router = useRouter();
  const isAgency = initial.role === "AGENCY";
  const STEPS = isAgency ? STEPS_AGENCY : STEPS_REALTOR;

  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  const [state, setState] = useState<WizardState>({
    publicHeadline: initial.publicHeadline ?? "",
    publicBio: initial.publicBio ?? "",
    publicCity: initial.publicCity ?? "",
    publicState: initial.publicState ?? "",
    publicServiceAreas: initial.publicServiceAreas ?? [],
    publicWhatsApp: initial.publicWhatsApp ?? "",
    publicPhoneOptIn: initial.publicPhoneOptIn ?? false,
    publicInstagram: initial.publicInstagram ?? "",
    publicLinkedIn: initial.publicLinkedIn ?? "",
  });

  const [areaDraft, setAreaDraft] = useState("");

  const headlineResult = useMemo(() => validateHeadline(state.publicHeadline), [state.publicHeadline]);
  const bioResult = useMemo(() => validateBio(state.publicBio), [state.publicBio]);
  const bioScore = useMemo(() => scoreBio(state.publicBio), [state.publicBio]);

  const canAdvance = useMemo(() => {
    const step = STEPS[stepIndex];
    switch (step.key) {
      case "headline":
        return headlineResult.level !== "block";
      case "bio":
        return bioResult.level !== "block";
      case "location":
        return state.publicCity.trim().length > 0 && state.publicState.trim().length === 2;
      case "contact":
        return state.publicWhatsApp.replace(/\D/g, "").length >= 10;
      case "review":
        return true;
    }
  }, [
    STEPS,
    bioResult.level,
    headlineResult.level,
    state.publicCity,
    state.publicState,
    state.publicWhatsApp,
    stepIndex,
  ]);

  const updateField = <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setSavedOk(false);
    setSaveError(null);
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const addArea = () => {
    const v = areaDraft.trim();
    if (!v) return;
    if (state.publicServiceAreas.includes(v)) {
      setAreaDraft("");
      return;
    }
    if (state.publicServiceAreas.length >= 12) return;
    updateField("publicServiceAreas", [...state.publicServiceAreas, v]);
    setAreaDraft("");
  };

  const removeArea = (area: string) => {
    updateField(
      "publicServiceAreas",
      state.publicServiceAreas.filter((a) => a !== area)
    );
  };

  const submit = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        publicHeadline: state.publicHeadline.trim() || null,
        publicBio: state.publicBio.trim() || null,
        publicCity: state.publicCity.trim() || null,
        publicState: state.publicState.trim().toUpperCase() || null,
        publicServiceAreas: state.publicServiceAreas,
        publicWhatsApp: state.publicWhatsApp.replace(/\D/g, "") || null,
        publicPhoneOptIn: state.publicPhoneOptIn,
        publicInstagram: state.publicInstagram.trim() || null,
        publicLinkedIn: state.publicLinkedIn.trim() || null,
      };
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Não foi possível salvar agora.");
      }
      setSavedOk(true);
      router.push("/profile?from=wizard");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro inesperado ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const step = STEPS[stepIndex];

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
            <h1 className="text-base font-semibold text-slate-900">Melhore seu perfil público</h1>
          </div>
          <Link
            href="/profile"
            className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
          >
            Voltar ao perfil
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((definition, index) => {
            const reached = index <= stepIndex;
            const active = index === stepIndex;
            return (
              <li
                key={definition.key}
                className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                  active
                    ? "bg-slate-900 text-white"
                    : reached
                      ? "bg-slate-200 text-slate-800"
                      : "bg-white text-slate-500 ring-1 ring-inset ring-slate-200"
                }`}
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">
                  {index + 1}
                </span>
                {definition.label}
              </li>
            );
          })}
        </ol>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Passo {stepIndex + 1} de {STEPS.length}
          </p>
          <h2 className="mt-2 font-serif text-2xl text-slate-950 sm:text-3xl">{step.label}</h2>
          <p className="mt-2 text-sm text-slate-600">{step.helper}</p>

          {step.key === "headline" ? (
            <div className="mt-6">
              <label className="text-xs font-medium text-slate-700" htmlFor="wizardHeadline">
                Headline pública
              </label>
              <input
                id="wizardHeadline"
                type="text"
                maxLength={140}
                value={state.publicHeadline}
                onChange={(e) => updateField("publicHeadline", e.target.value)}
                placeholder="Ex: Apartamentos compactos no Centro de Petrolina"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                <span>Use uma especialidade concreta (tipo, bairro, perfil de cliente).</span>
                <span>{state.publicHeadline.length}/120</span>
              </div>
              <ValidationFeedback result={headlineResult} />
            </div>
          ) : null}

          {step.key === "bio" ? (
            <div className="mt-6">
              <label className="text-xs font-medium text-slate-700" htmlFor="wizardBio">
                Bio
              </label>
              <textarea
                id="wizardBio"
                rows={6}
                maxLength={600}
                value={state.publicBio}
                onChange={(e) => updateField("publicBio", e.target.value)}
                placeholder="Quem você é + o que faz + como atende. Mencione anos de mercado, bairros e estilo de atendimento."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                <span>Mínimo 80 caracteres, dividido em frases curtas.</span>
                <span>{state.publicBio.length}/500</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                <span>Score:</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      bioScore < 40 ? "bg-rose-400" : bioScore < 70 ? "bg-amber-400" : "bg-emerald-500"
                    }`}
                    style={{ width: `${bioScore}%` }}
                  />
                </div>
                <span className="font-semibold text-slate-800">{bioScore}</span>
              </div>
              <ValidationFeedback result={bioResult} />
            </div>
          ) : null}

          {step.key === "location" ? (
            <div className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                <div>
                  <label className="text-xs font-medium text-slate-700" htmlFor="wizardCity">
                    Cidade
                  </label>
                  <input
                    id="wizardCity"
                    type="text"
                    value={state.publicCity}
                    onChange={(e) => updateField("publicCity", e.target.value)}
                    placeholder="Petrolina"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700" htmlFor="wizardState">
                    UF
                  </label>
                  <input
                    id="wizardState"
                    type="text"
                    maxLength={2}
                    value={state.publicState}
                    onChange={(e) => updateField("publicState", e.target.value.toUpperCase())}
                    placeholder="PE"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm uppercase outline-none transition focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-700">
                  Áreas atendidas (até 12)
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={areaDraft}
                    onChange={(e) => setAreaDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addArea();
                      }
                    }}
                    placeholder="Ex: Centro, Cidade Universitária"
                    className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-slate-400"
                  />
                  <button
                    type="button"
                    onClick={addArea}
                    className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                  >
                    Adicionar
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {state.publicServiceAreas.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => removeArea(area)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-700"
                    >
                      {area} <span aria-hidden="true">×</span>
                    </button>
                  ))}
                  {state.publicServiceAreas.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Nenhuma área adicionada. Sugestão: comece pelo bairro onde você fecha mais
                      negócios.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {step.key === "contact" ? (
            <div className="mt-6 space-y-5">
              <div>
                <label className="text-xs font-medium text-slate-700" htmlFor="wizardWhatsApp">
                  WhatsApp (com DDD)
                </label>
                <input
                  id="wizardWhatsApp"
                  type="text"
                  value={state.publicWhatsApp}
                  onChange={(e) => updateField("publicWhatsApp", e.target.value)}
                  placeholder="5587999999999"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                />
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={state.publicPhoneOptIn}
                  disabled={!initial.hasVerifiedPhone}
                  onChange={(e) => updateField("publicPhoneOptIn", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className="block font-medium text-slate-900">
                    Exibir telefone verificado no perfil público
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {initial.hasVerifiedPhone
                      ? "Quando ativo, o botão Ligar fica disponível na página pública."
                      : "Verifique seu telefone em /profile antes de ativar esta opção."}
                  </span>
                </span>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-700" htmlFor="wizardInstagram">
                    Instagram (handle ou URL)
                  </label>
                  <input
                    id="wizardInstagram"
                    type="text"
                    value={state.publicInstagram}
                    onChange={(e) => updateField("publicInstagram", e.target.value)}
                    placeholder="@seuhandle"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700" htmlFor="wizardLinkedIn">
                    LinkedIn (URL)
                  </label>
                  <input
                    id="wizardLinkedIn"
                    type="text"
                    value={state.publicLinkedIn}
                    onChange={(e) => updateField("publicLinkedIn", e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step.key === "review" ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Headline
                </p>
                <p className="mt-1 font-serif text-xl text-slate-950">
                  {state.publicHeadline || "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Bio
                </p>
                <p className="mt-1 whitespace-pre-line text-sm leading-7 text-slate-700">
                  {state.publicBio || "—"}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Localização
                  </p>
                  <p className="mt-1 text-sm text-slate-900">
                    {[state.publicCity, state.publicState].filter(Boolean).join("/") || "—"}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {state.publicServiceAreas.length} área
                    {state.publicServiceAreas.length === 1 ? "" : "s"} atendida
                    {state.publicServiceAreas.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Contato
                  </p>
                  <p className="mt-1 text-sm text-slate-900">
                    {state.publicWhatsApp || "—"}
                    {state.publicPhoneOptIn ? " · ligar liberado" : ""}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {[state.publicInstagram, state.publicLinkedIn].filter(Boolean).join(" · ") ||
                      "Sem redes sociais"}
                  </p>
                </div>
              </div>
              {saveError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {saveError}
                </div>
              ) : null}
              {savedOk ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <Check className="mr-2 inline h-4 w-4" />
                  Perfil atualizado! Redirecionando…
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <nav className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStepIndex((idx) => Math.max(0, idx - 1))}
            disabled={stepIndex === 0 || saving}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>

          {step.key === "review" ? (
            <button
              type="button"
              disabled={!canAdvance || saving}
              onClick={submit}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Publicar atualizações
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={!canAdvance}
              onClick={() => setStepIndex((idx) => Math.min(STEPS.length - 1, idx + 1))}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Próximo
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </nav>

        {initial.publicSlug ? (
          <p className="mt-6 text-center text-xs text-slate-500">
            Seu perfil público:{" "}
            <Link
              className="underline-offset-4 hover:underline"
              href={`/${isAgency ? "agencia" : "realtor"}/${initial.publicSlug}`}
              target="_blank"
            >
              /{isAgency ? "agencia" : "realtor"}/{initial.publicSlug}
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
