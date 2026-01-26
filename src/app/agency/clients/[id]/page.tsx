"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Tabs from "@/components/ui/Tabs";
import EmptyState from "@/components/ui/EmptyState";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import PropertyCardV2 from "@/components/dashboard/PropertyCardV2";
import PriceRangeSlider from "@/components/PriceRangeSlider";
import { buildPropertyPath } from "@/lib/slug";
import { ArrowLeft, Copy, ExternalLink, RefreshCw, Save, UserRound, X } from "lucide-react";

type ClientStatus = "ACTIVE" | "PAUSED";

type ClientPreference = {
  id?: string;
  clientId?: string;
  city: string;
  state: string;
  neighborhoods: string[];
  purpose: "SALE" | "RENT" | null;
  types: string[];
  minPrice: number | null;
  maxPrice: number | null;
  bedroomsMin: number | null;
  bathroomsMin: number | null;
  areaMin: number | null;
  scope: "PORTFOLIO" | "MARKET";
  updatedAt?: string | Date | null;
};

type LocationSuggestion = {
  label: string;
  city: string;
  state: string;
  neighborhood: string | null;
  count?: number;
};

type LocationsResponse = {
  success: boolean;
  suggestions?: LocationSuggestion[];
  error?: string;
};

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: ClientStatus;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  preference: ClientPreference | null;
};

type ClientGetResponse = {
  success: boolean;
  client?: Client;
  error?: string;
};

type ClientPatchResponse = {
  success: boolean;
  client?: Client;
  error?: string;
};

type PreferenceGetResponse = {
  success: boolean;
  client?: { id: string; name: string };
  preference?: ClientPreference | null;
  error?: string;
};

type PreferencePutResponse = {
  success: boolean;
  preference?: ClientPreference;
  error?: string;
  issues?: any;
};

type MatchItem = {
  property: {
    id: string;
    title: string;
    price: number;
    type: string;
    purpose: "SALE" | "RENT" | null;
    status: "ACTIVE" | "PAUSED" | "DRAFT";
    city: string;
    state: string;
    neighborhood: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    areaM2: number | null;
    image: string | null;
  };
  score: number;
  reasons: string[];
};

type MatchesResponse = {
  success: boolean;
  team: { id: string; name: string } | null;
  client: any;
  scope: "PORTFOLIO" | "MARKET" | null;
  refreshed: boolean;
  matches: MatchItem[];
  error?: string;
};

type RecommendationListRow = {
  id: string;
  token: string;
  shareUrl: string;
  title: string | null;
  message: string | null;
  propertyCount: number;
  expiresAt: string | null;
  createdAt: string | null;
};

type RecommendationListsResponse = {
  success: boolean;
  team?: { id: string; name: string } | null;
  lists?: RecommendationListRow[];
  error?: string;
};

type CreateListResponse = {
  success: boolean;
  shareUrl?: string;
  token?: string;
  expiresAt?: string;
  propertyCount?: number;
  error?: string;
};

type WhatsAppDraftResponse = {
  success: boolean;
  usedAi: boolean;
  draft: string;
  whatsappUrl: string;
  recommendationList: {
    id: string;
    token: string;
    shareUrl: string | null;
    propertyCount: number;
    expiresAt: string | null;
  } | null;
  error?: string;
};

const PROPERTY_TYPES = ["HOUSE", "APARTMENT", "CONDO", "LAND", "RURAL", "COMMERCIAL"] as const;

const REMOVED_TYPES = new Set(["STUDIO", "TOWNHOUSE"]);

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  HOUSE: "Casa",
  APARTMENT: "Apartamento",
  CONDO: "Condomínio",
  LAND: "Terreno",
  RURAL: "Imóvel rural",
  COMMERCIAL: "Comercial",
};

function roleFromSession(session: any) {
  return session?.user?.role || session?.role || "USER";
}

function formatDatePt(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function brlFromCents(cents: number | null | undefined) {
  if (cents == null) return "";
  const v = Number(cents);
  if (!Number.isFinite(v)) return "";
  return String(Math.round(v / 100));
}

function centsFromBrlInput(value: string) {
  const cleaned = String(value || "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned.replace(/[^0-9]/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n) * 100);
}

function formatCurrency(value: string) {
  if (!value) return "";
  const num = parseInt(String(value).replace(/\D/g, ""), 10);
  if (Number.isNaN(num)) return "";
  return num.toLocaleString("pt-BR");
}

function parseCurrency(value: string) {
  return String(value || "").replace(/\D/g, "");
}

async function copyToClipboard(text: string) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
  }

  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export default function AgencyClientDetailPage() {
  const params = useParams<{ id: string }>();
  const clientId = useMemo(() => String((params as any)?.id || ""), [params]);

  const { data: session, status } = useSession();
  const role = useMemo(() => roleFromSession(session as any), [session]);
  const canUse = role === "AGENCY" || role === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [client, setClient] = useState<Client | null>(null);

  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<ClientStatus>("ACTIVE");
  const [notesDraft, setNotesDraft] = useState("");

  const [prefLoading, setPrefLoading] = useState(false);
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefError, setPrefError] = useState<string | null>(null);
  const [pref, setPref] = useState<ClientPreference | null>(null);
  const [prefCity, setPrefCity] = useState("");
  const [prefState, setPrefState] = useState("");
  const [prefNeighborhoodDraft, setPrefNeighborhoodDraft] = useState("");
  const [prefNeighborhoodTags, setPrefNeighborhoodTags] = useState<string[]>([]);
  const [prefPurpose, setPrefPurpose] = useState<ClientPreference["purpose"]>(null);
  const [prefTypes, setPrefTypes] = useState<string[]>([]);
  const [prefMinPrice, setPrefMinPrice] = useState("");
  const [prefMaxPrice, setPrefMaxPrice] = useState("");
  const [prefBedroomsMin, setPrefBedroomsMin] = useState("");
  const [prefBathroomsMin, setPrefBathroomsMin] = useState("");
  const [prefAreaMin, setPrefAreaMin] = useState("");
  const [prefScope, setPrefScope] = useState<ClientPreference["scope"]>("PORTFOLIO");

  const [selectedCity, setSelectedCity] = useState<{ city: string; state: string } | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<LocationSuggestion[]>([]);
  const [citySuggestOpen, setCitySuggestOpen] = useState(false);

  const [hoodSuggestions, setHoodSuggestions] = useState<LocationSuggestion[]>([]);
  const [hoodSuggestOpen, setHoodSuggestOpen] = useState(false);

  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [matchesScope, setMatchesScope] = useState<"PORTFOLIO" | "MARKET" | null>(null);
  const [matchesRefreshedAt, setMatchesRefreshedAt] = useState<string | null>(null);

  const [listsLoading, setListsLoading] = useState(false);
  const [listsError, setListsError] = useState<string | null>(null);
  const [lists, setLists] = useState<RecommendationListRow[]>([]);
  const [creatingList, setCreatingList] = useState(false);
  const [listTitle, setListTitle] = useState("");
  const [listMessage, setListMessage] = useState("");
  const [listExpiresInDays, setListExpiresInDays] = useState("14");

  const [waBusy, setWaBusy] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);
  const [waCustomMessage, setWaCustomMessage] = useState("");
  const [waListId, setWaListId] = useState<string>("");
  const [waDraft, setWaDraft] = useState<string>("");
  const [waUrl, setWaUrl] = useState<string>("");
  const [waUsedAi, setWaUsedAi] = useState<boolean>(false);
  const [waShareUrl, setWaShareUrl] = useState<string | null>(null);

  const loadClient = async () => {
    try {
      setError(null);
      setLoading(true);

      const res = await fetch(`/api/agency/clients/${encodeURIComponent(clientId)}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ClientGetResponse | null;
      if (!res.ok || !json?.success || !json.client) {
        throw new Error(json?.error || "Não conseguimos carregar o cliente agora.");
      }
      setClient(json.client);
      setNameDraft(json.client.name || "");
      setEmailDraft(json.client.email || "");
      setPhoneDraft(json.client.phone || "");
      setStatusDraft(json.client.status || "ACTIVE");
      setNotesDraft(json.client.notes || "");
    } catch (e: any) {
      setError(e?.message || "Não conseguimos carregar o cliente agora.");
      setClient(null);
    } finally {
      setLoading(false);
    }
  };

  const loadPreference = async () => {
    try {
      setPrefError(null);
      setPrefLoading(true);

      const res = await fetch(`/api/agency/clients/${encodeURIComponent(clientId)}/preference`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as PreferenceGetResponse | null;
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Não conseguimos carregar as preferências agora.");
      }
      const p = (json.preference as any) || null;
      setPref(p);
      setPrefCity(p?.city || "");
      setPrefState(p?.state || "");
      setPrefNeighborhoodTags(Array.isArray(p?.neighborhoods) ? p.neighborhoods.map((s: any) => String(s)).filter(Boolean) : []);
      setPrefNeighborhoodDraft("");
      setPrefPurpose((p?.purpose as any) ?? null);
      setPrefTypes(Array.isArray(p?.types) ? p.types.filter((t: any) => !REMOVED_TYPES.has(String(t))) : []);
      setPrefMinPrice(brlFromCents(p?.minPrice ?? null));
      setPrefMaxPrice(brlFromCents(p?.maxPrice ?? null));
      setPrefBedroomsMin(p?.bedroomsMin != null ? String(p.bedroomsMin) : "");
      setPrefBathroomsMin(p?.bathroomsMin != null ? String(p.bathroomsMin) : "");
      setPrefAreaMin(p?.areaMin != null ? String(p.areaMin) : "");
      setPrefScope((p?.scope as any) || "PORTFOLIO");

      const cityRaw = String(p?.city || "").trim();
      const stateRaw = String(p?.state || "").trim();
      setSelectedCity(cityRaw && stateRaw ? { city: cityRaw, state: stateRaw } : null);
    } catch (e: any) {
      setPrefError(e?.message || "Não conseguimos carregar as preferências agora.");
      setPref(null);
    } finally {
      setPrefLoading(false);
    }
  };

  const savePreference = async () => {
    try {
      setPrefError(null);
      setPrefSaving(true);

      if (!selectedCity || selectedCity.city !== prefCity.trim() || selectedCity.state !== prefState.trim()) {
        throw new Error("Selecione uma cidade válida a partir da lista.");
      }

      const neighborhoods = Array.from(
        new Set(
          (Array.isArray(prefNeighborhoodTags) ? prefNeighborhoodTags : [])
            .map((s) => String(s).trim())
            .filter(Boolean)
        )
      ).slice(0, 100);

      const payload: any = {
        city: prefCity.trim(),
        state: prefState.trim(),
        neighborhoods,
        purpose: prefPurpose ?? null,
        types: (prefTypes || []).filter((t) => !REMOVED_TYPES.has(String(t))),
        minPrice: centsFromBrlInput(prefMinPrice),
        maxPrice: centsFromBrlInput(prefMaxPrice),
        bedroomsMin: prefBedroomsMin.trim() ? Number(prefBedroomsMin) : null,
        bathroomsMin: prefBathroomsMin.trim() ? Number(prefBathroomsMin) : null,
        areaMin: prefAreaMin.trim() ? Number(prefAreaMin) : null,
        scope: prefScope,
      };

      const res = await fetch(`/api/agency/clients/${encodeURIComponent(clientId)}/preference`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as PreferencePutResponse | null;
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Não conseguimos salvar as preferências agora.");
      }

      setPref(json.preference || null);
    } catch (e: any) {
      setPrefError(e?.message || "Não conseguimos salvar as preferências agora.");
    } finally {
      setPrefSaving(false);
    }
  };

  const loadMatches = async (opts?: { refresh?: boolean }) => {
    try {
      setMatchesError(null);
      setMatchesLoading(true);
      const qs = new URLSearchParams();
      qs.set("limit", "24");
      if (opts?.refresh) qs.set("refresh", "1");
      const res = await fetch(`/api/agency/clients/${encodeURIComponent(clientId)}/matches?${qs.toString()}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as MatchesResponse | null;
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Não conseguimos carregar os matches agora.");
      }
      setMatches(Array.isArray(json.matches) ? json.matches : []);
      setMatchesScope(json.scope || null);
      setMatchesRefreshedAt(new Date().toISOString());
    } catch (e: any) {
      setMatchesError(e?.message || "Não conseguimos carregar os matches agora.");
      setMatches([]);
    } finally {
      setMatchesLoading(false);
    }
  };

  const loadLists = async () => {
    try {
      setListsError(null);
      setListsLoading(true);
      const res = await fetch(`/api/agency/clients/${encodeURIComponent(clientId)}/recommendation-lists`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as RecommendationListsResponse | null;
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Não conseguimos carregar as listas agora.");
      }
      setLists(Array.isArray(json.lists) ? json.lists : []);
    } catch (e: any) {
      setListsError(e?.message || "Não conseguimos carregar as listas agora.");
      setLists([]);
    } finally {
      setListsLoading(false);
    }
  };

  const createList = async () => {
    try {
      setListsError(null);
      setCreatingList(true);

      const expiresInDaysRaw = Number(String(listExpiresInDays || "14").trim());
      const expiresInDays = Number.isFinite(expiresInDaysRaw) ? Math.min(Math.max(Math.round(expiresInDaysRaw), 1), 60) : 14;

      const payload: any = {
        title: listTitle.trim() ? listTitle.trim() : null,
        message: listMessage.trim() ? listMessage.trim() : null,
        expiresInDays,
      };

      const res = await fetch(`/api/agency/clients/${encodeURIComponent(clientId)}/recommendation-lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as CreateListResponse | null;
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Não conseguimos gerar o link agora.");
      }

      setListTitle("");
      setListMessage("");
      await loadLists();
    } catch (e: any) {
      setListsError(e?.message || "Não conseguimos gerar o link agora.");
    } finally {
      setCreatingList(false);
    }
  };

  const saveClient = async () => {
    try {
      if (!client) return;
      setSaveError(null);
      setEditing(true);

      const payload: any = {
        name: nameDraft.trim() || client.name,
        email: emailDraft.trim() ? emailDraft.trim() : null,
        phone: phoneDraft.trim() ? phoneDraft.trim() : null,
        status: statusDraft,
        notes: notesDraft.trim() ? notesDraft.trim() : null,
      };

      const res = await fetch(`/api/agency/clients/${encodeURIComponent(client.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as ClientPatchResponse | null;
      if (!res.ok || !json?.success || !json.client) {
        throw new Error(json?.error || "Não conseguimos salvar o cliente agora.");
      }

      setClient(json.client);
      setNameDraft(json.client.name || "");
      setEmailDraft(json.client.email || "");
      setPhoneDraft(json.client.phone || "");
      setStatusDraft(json.client.status || "ACTIVE");
      setNotesDraft(json.client.notes || "");
    } catch (e: any) {
      setSaveError(e?.message || "Não conseguimos salvar o cliente agora.");
    } finally {
      setEditing(false);
    }
  };

  const generateWhatsAppDraft = async () => {
    try {
      if (!client) return;
      setWaError(null);
      setWaBusy(true);
      setWaDraft("");
      setWaUrl("");
      setWaShareUrl(null);

      const payload: any = {
        customMessage: waCustomMessage.trim() ? waCustomMessage.trim() : null,
      };

      if (waListId) {
        payload.recommendationListId = waListId;
      }

      const res = await fetch(`/api/agency/clients/${encodeURIComponent(client.id)}/whatsapp-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as WhatsAppDraftResponse | null;
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Não conseguimos gerar a mensagem agora.");
      }

      setWaDraft(json.draft || "");
      setWaUrl(json.whatsappUrl || "");
      setWaUsedAi(!!json.usedAi);
      setWaShareUrl(json.recommendationList?.shareUrl || null);

      await loadLists();
    } catch (e: any) {
      setWaError(e?.message || "Não conseguimos gerar a mensagem agora.");
    } finally {
      setWaBusy(false);
    }
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!canUse) return;
    if (!clientId) return;
    void loadClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, canUse, clientId]);

  useEffect(() => {
    if (!client) return;
    void loadPreference();
    void loadMatches();
    void loadLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id]);

  useEffect(() => {
    if (!canUse) return;
    const q = prefCity.trim();
    if (!q) {
      setCitySuggestions([]);
      return;
    }

    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/locations?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as LocationsResponse | null;
        const suggestions = Array.isArray(json?.suggestions) ? json!.suggestions! : [];
        const cityOnly = suggestions.filter((s) => !s.neighborhood);
        setCitySuggestions(cityOnly.slice(0, 8));
      } catch {
        setCitySuggestions([]);
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [prefCity, canUse]);

  useEffect(() => {
    if (!canUse) return;
    if (!selectedCity) {
      setHoodSuggestions([]);
      return;
    }

    const query = prefNeighborhoodDraft.trim();
    const q = query ? query : selectedCity.city;

    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/locations?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as LocationsResponse | null;
        const suggestions = Array.isArray(json?.suggestions) ? json!.suggestions! : [];
        const hoods = suggestions
          .filter((s) => !!s.neighborhood)
          .filter((s) => String(s.city) === selectedCity.city && String(s.state) === selectedCity.state)
          .filter((s) => !prefNeighborhoodTags.includes(String(s.neighborhood)))
          .slice(0, 10);
        setHoodSuggestions(hoods);
      } catch {
        setHoodSuggestions([]);
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [prefNeighborhoodDraft, selectedCity, canUse, prefNeighborhoodTags]);

  if (status === "loading" || loading) {
    return <CenteredSpinner message="Carregando cliente..." />;
  }

  if (!canUse) {
    return (
      <EmptyState
        title="Acesso restrito"
        description="Somente contas de agência podem acessar esta área."
        action={
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold"
          >
            Voltar
          </Link>
        }
      />
    );
  }

  if (error || !client) {
    return (
      <EmptyState
        title="Cliente não encontrado"
        description={error || "Não conseguimos carregar este cliente."}
        action={
          <Link
            href="/agency/clients"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold"
          >
            Voltar para clientes
          </Link>
        }
      />
    );
  }

  const statusBadge =
    client.status === "ACTIVE"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-amber-200 bg-amber-50 text-amber-800";

  const tabItems = [
    {
      key: "preferences",
      label: "Preferências",
      content: (
        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-200/70 bg-white/70 backdrop-blur p-4 shadow-soft">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-gray-900">Preferências de busca</div>
                <div className="text-xs text-gray-500">Atualize a preferência do cliente (isso afeta os matches).</div>
              </div>
              <button
                type="button"
                onClick={savePreference}
                disabled={prefSaving}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl glass-teal btn-modern text-white text-sm font-semibold disabled:opacity-70"
              >
                <Save className="w-4 h-4 mr-2" />
                {prefSaving ? "Salvando..." : "Salvar"}
              </button>
            </div>

            {prefLoading ? (
              <div className="py-10 text-center text-sm text-gray-600">Carregando...</div>
            ) : (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cidade</label>
                  <div className="relative">
                    <input
                      value={prefCity}
                      onChange={(e) => {
                        setPrefCity(String(e.target.value));
                        setCitySuggestOpen(true);
                        setSelectedCity(null);
                        setPrefState("");
                        setPrefNeighborhoodTags([]);
                        setPrefNeighborhoodDraft("");
                      }}
                      onFocus={() => setCitySuggestOpen(true)}
                      onBlur={() => {
                        window.setTimeout(() => setCitySuggestOpen(false), 160);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
                      placeholder="Ex: São Paulo"
                    />

                    {citySuggestOpen && citySuggestions.length ? (
                      <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                        {citySuggestions.map((s) => {
                          const key = `${s.city}__${s.state}`;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                setPrefCity(String(s.city));
                                setPrefState(String(s.state));
                                setSelectedCity({ city: String(s.city), state: String(s.state) });
                                setCitySuggestOpen(false);
                                setPrefNeighborhoodTags([]);
                                setPrefNeighborhoodDraft("");
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              <div className="text-gray-900 font-medium">{s.city}</div>
                              <div className="text-xs text-gray-500">{s.state}</div>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Estado</label>
                  <input
                    value={prefState}
                    readOnly
                    className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
                    placeholder="Ex: SP"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Bairros</label>
                  <div className="relative">
                    <input
                      value={prefNeighborhoodDraft}
                      onChange={(e) => {
                        setPrefNeighborhoodDraft(String(e.target.value));
                        setHoodSuggestOpen(true);
                      }}
                      onFocus={() => setHoodSuggestOpen(true)}
                      onBlur={() => {
                        window.setTimeout(() => setHoodSuggestOpen(false), 160);
                      }}
                      disabled={!selectedCity}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm disabled:bg-gray-50"
                      placeholder={selectedCity ? "Digite para buscar bairros" : "Selecione uma cidade primeiro"}
                    />

                    {hoodSuggestOpen && hoodSuggestions.length ? (
                      <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                        {hoodSuggestions.map((s) => {
                          const hood = String(s.neighborhood || "");
                          if (!hood) return null;
                          return (
                            <button
                              key={`${selectedCity?.city}__${selectedCity?.state}__${hood}`}
                              type="button"
                              onClick={() => {
                                setPrefNeighborhoodTags((prev) => {
                                  const next = Array.isArray(prev) ? [...prev] : [];
                                  if (next.includes(hood)) return next;
                                  return [...next, hood].slice(0, 100);
                                });
                                setPrefNeighborhoodDraft("");
                                setHoodSuggestOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              <div className="text-gray-900 font-medium">{hood}</div>
                              <div className="text-xs text-gray-500">
                                {s.city}, {s.state}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>

                  {prefNeighborhoodTags.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {prefNeighborhoodTags.map((n) => (
                        <div
                          key={n}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700"
                        >
                          <span className="max-w-[220px] truncate">{n}</span>
                          <button
                            type="button"
                            onClick={() => setPrefNeighborhoodTags((prev) => prev.filter((x) => x !== n))}
                            className="inline-flex items-center justify-center rounded-md hover:bg-gray-100"
                            aria-label={`Remover bairro ${n}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Finalidade</label>
                  <select
                    value={prefPurpose || ""}
                    onChange={(e) => setPrefPurpose((e.target.value || null) as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
                  >
                    <option value="">Qualquer</option>
                    <option value="SALE">Venda</option>
                    <option value="RENT">Aluguel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Scope</label>
                  <select
                    value={prefScope}
                    onChange={(e) => setPrefScope(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
                  >
                    <option value="PORTFOLIO">PORTFOLIO</option>
                    <option value="MARKET">MARKET</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tipos</label>
                  <div className="flex flex-wrap gap-2">
                    {PROPERTY_TYPES.map((t) => {
                      const active = prefTypes.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setPrefTypes((prev) => {
                              if (prev.includes(t)) return prev.filter((x) => x !== t);
                              return [...prev, t];
                            });
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            active
                              ? "glass-teal text-white border-transparent shadow-sm"
                              : "border-gray-200/70 bg-white/80 text-gray-700 hover:bg-white hover:shadow-sm"
                          }`}
                        >
                          {PROPERTY_TYPE_LABEL[t] || t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-700">Preço</label>
                    <div className="text-[11px] text-gray-500">
                      {prefMinPrice.trim() ? `De R$ ${formatCurrency(prefMinPrice)}` : "Sem mínimo"} ·{" "}
                      {prefMaxPrice.trim() ? `Até R$ ${formatCurrency(prefMaxPrice)}` : "Sem máximo"}
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Mínimo</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                        <input
                          type="text"
                          placeholder="0"
                          value={formatCurrency(prefMinPrice)}
                          onChange={(e) => setPrefMinPrice(parseCurrency(e.target.value))}
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
                          inputMode="numeric"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Máximo</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                        <input
                          type="text"
                          placeholder="Sem limite"
                          value={formatCurrency(prefMaxPrice)}
                          onChange={(e) => setPrefMaxPrice(parseCurrency(e.target.value))}
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
                          inputMode="numeric"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-2">
                    <PriceRangeSlider
                      min={0}
                      max={5000000}
                      step={50000}
                      minValue={prefMinPrice.trim() ? Number(prefMinPrice) : null}
                      maxValue={prefMaxPrice.trim() ? Number(prefMaxPrice) : null}
                      onPreviewChange={({ min, max }) => {
                        setPrefMinPrice(min == null ? "" : String(min));
                        setPrefMaxPrice(max == null ? "" : String(max));
                      }}
                      onChange={({ min, max }) => {
                        setPrefMinPrice(min == null ? "" : String(min));
                        setPrefMaxPrice(max == null ? "" : String(max));
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Quartos mín.</label>
                  <input
                    value={prefBedroomsMin}
                    onChange={(e) => setPrefBedroomsMin(String(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
                    inputMode="numeric"
                    placeholder="Ex: 2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Banheiros mín.</label>
                  <input
                    value={prefBathroomsMin}
                    onChange={(e) => setPrefBathroomsMin(String(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
                    inputMode="decimal"
                    placeholder="Ex: 2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Área mín. (m²)</label>
                  <input
                    value={prefAreaMin}
                    onChange={(e) => setPrefAreaMin(String(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
                    inputMode="numeric"
                    placeholder="Ex: 70"
                  />
                </div>
              </div>
            )}

            {pref?.updatedAt ? (
              <div className="mt-3 text-xs text-gray-500">Atualizado em {formatDatePt(String(pref.updatedAt as any))}</div>
            ) : null}

            {prefError ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {prefError}
              </div>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: "matches",
      label: "Matches",
      content: (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Matches</div>
                <div className="text-xs text-gray-500">
                  Score por preferência ({matchesScope || "—"}). Última consulta: {matchesRefreshedAt ? formatDatePt(matchesRefreshedAt) : "—"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void loadMatches({ refresh: true })}
                disabled={matchesLoading}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-70"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${matchesLoading ? "animate-spin" : ""}`} />
                {matchesLoading ? "Atualizando..." : "Recalcular"}
              </button>
            </div>

            {matchesError ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {matchesError}
              </div>
            ) : null}

            {matchesLoading ? (
              <div className="py-10 text-center text-sm text-gray-600">Carregando...</div>
            ) : matches.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-600">Nenhum match ainda. Defina preferências e tente novamente.</div>
            ) : (
              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {matches.map((m) => {
                  const p = m.property;
                  const href = buildPropertyPath(p.id, p.title);
                  return (
                    <div key={p.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-gray-600">Score: {Math.round(m.score)}</div>
                        {Array.isArray(m.reasons) && m.reasons.length ? (
                          <div className="text-[11px] text-gray-500 truncate max-w-[60%]">{m.reasons.slice(0, 3).join(" · ")}</div>
                        ) : (
                          <div className="text-[11px] text-gray-400">—</div>
                        )}
                      </div>
                      <PropertyCardV2
                        id={p.id}
                        href={href}
                        title={p.title}
                        price={p.price}
                        status={p.status}
                        image={p.image}
                        neighborhood={p.neighborhood}
                        city={p.city}
                        state={p.state}
                        bedrooms={p.bedrooms}
                        bathrooms={p.bathrooms}
                        areaM2={p.areaM2}
                        type={p.type}
                        views={0}
                        leads={0}
                        quickActions={{}}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "lists",
      label: "Listas",
      content: (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-gray-900">Listas de recomendação</div>
                <div className="text-xs text-gray-500">Gere links para compartilhar com o cliente.</div>
              </div>
              <button
                type="button"
                onClick={() => void loadLists()}
                disabled={listsLoading}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-70"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${listsLoading ? "animate-spin" : ""}`} />
                Atualizar
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Título (opcional)</label>
                <input
                  value={listTitle}
                  onChange={(e) => setListTitle(String(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
                  placeholder="Ex: Imóveis para visitar esta semana"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Expira em (dias)</label>
                <input
                  value={listExpiresInDays}
                  onChange={(e) => setListExpiresInDays(String(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
                  inputMode="numeric"
                  placeholder="14"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mensagem (opcional)</label>
                <textarea
                  value={listMessage}
                  onChange={(e) => setListMessage(String(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm min-h-[90px]"
                  placeholder="Texto que aparece no topo da página pública..."
                />
              </div>
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={createList}
                disabled={creatingList}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-70"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${creatingList ? "animate-spin" : ""}`} />
                {creatingList ? "Gerando..." : "Gerar nova lista"}
              </button>
            </div>

            {listsError ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {listsError}
              </div>
            ) : null}

            <div className="mt-6">
              {listsLoading ? (
                <div className="py-8 text-center text-sm text-gray-600">Carregando...</div>
              ) : lists.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-600">Nenhuma lista criada ainda.</div>
              ) : (
                <div className="space-y-3">
                  {lists.map((l) => (
                    <div key={l.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{l.title || "Lista sem título"}</div>
                          <div className="mt-1 text-xs text-gray-500">
                            {l.propertyCount} imóveis · Criada em {formatDatePt(l.createdAt)} · Expira em {formatDatePt(l.expiresAt)}
                          </div>
                          {l.message ? <div className="mt-2 text-xs text-gray-600 whitespace-pre-line">{l.message}</div> : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void copyToClipboard(l.shareUrl)}
                            className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar link
                          </button>
                          <a
                            href={l.shareUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Abrir
                          </a>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-gray-500 break-all">{l.shareUrl}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      content: (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900">Mensagem para WhatsApp</div>
            <div className="text-xs text-gray-500">Gera uma mensagem pronta + link `wa.me`.</div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Observação extra (opcional)</label>
                <textarea
                  value={waCustomMessage}
                  onChange={(e) => setWaCustomMessage(String(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm min-h-[90px]"
                  placeholder="Ex: Dá prioridade para imóveis com varanda e perto do metrô..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Usar lista (opcional)</label>
                <select
                  value={waListId}
                  onChange={(e) => setWaListId(String(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
                >
                  <option value="">(automático)</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title || "Lista sem título"} ({l.propertyCount})
                    </option>
                  ))}
                </select>
                <div className="mt-2 text-[11px] text-gray-500">Se vazio, o endpoint usa a lista mais recente ou cria uma.</div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={generateWhatsAppDraft}
                disabled={waBusy}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-70"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${waBusy ? "animate-spin" : ""}`} />
                {waBusy ? "Gerando..." : "Gerar mensagem"}
              </button>

              {waDraft ? (
                <button
                  type="button"
                  onClick={() => void copyToClipboard(waDraft)}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar texto
                </button>
              ) : null}

              {waUrl ? (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir WhatsApp
                </a>
              ) : null}
            </div>

            {waError ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {waError}
              </div>
            ) : null}

            {waDraft ? (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-gray-700">Mensagem gerada {waUsedAi ? "(AI)" : "(fallback)"}</div>
                  {waShareUrl ? (
                    <button
                      type="button"
                      onClick={() => void copyToClipboard(waShareUrl)}
                      className="inline-flex items-center justify-center px-2 py-1 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Copiar link
                    </button>
                  ) : null}
                </div>
                <pre className="mt-2 whitespace-pre-wrap text-sm text-gray-800 font-sans">{waDraft}</pre>
                {waShareUrl ? <div className="mt-2 text-xs text-gray-500 break-all">{waShareUrl}</div> : null}
              </div>
            ) : null}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/agency/clients" className="inline-flex items-center text-sm font-semibold text-gray-700 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <UserRound className="w-5 h-5 text-gray-400" />
              <div className="text-lg font-semibold text-gray-900 truncate">{client.name}</div>
              <div className={`px-2 py-1 rounded-lg text-[11px] font-semibold border ${statusBadge}`}>
                {client.status === "ACTIVE" ? "Ativo" : "Pausado"}
              </div>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Criado em {formatDatePt(client.createdAt)} · Atualizado em {formatDatePt(client.updatedAt)}
            </div>
          </div>

          <button
            type="button"
            onClick={saveClient}
            disabled={editing}
            className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-70"
          >
            <Save className="w-4 h-4 mr-2" />
            {editing ? "Salvando..." : "Salvar dados"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nome</label>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(String(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
            <select
              value={statusDraft}
              onChange={(e) => setStatusDraft(e.target.value as ClientStatus)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
            >
              <option value="ACTIVE">Ativo</option>
              <option value="PAUSED">Pausado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail</label>
            <input
              value={emailDraft}
              onChange={(e) => setEmailDraft(String(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
              placeholder="(opcional)"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Telefone</label>
            <input
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(String(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
              placeholder="(opcional)"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Notas</label>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(String(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm min-h-[90px]"
              placeholder="(opcional)"
            />
          </div>
        </div>

        {saveError ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{saveError}</div>
        ) : null}
      </div>

      <Tabs items={tabItems as any} defaultKey="preferences" />
    </div>
  );
}
