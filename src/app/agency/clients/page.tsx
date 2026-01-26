"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";
import Drawer from "@/components/ui/Drawer";
import { X, Plus, UserRound, Phone, Mail, MapPin, Trash2 } from "lucide-react";
import PriceRangeSlider from "@/components/PriceRangeSlider";
import AgencyClientsOnboarding, { resetAgencyClientsOnboarding } from "@/components/onboarding/AgencyClientsOnboarding";

type ClientStatus = "ACTIVE" | "PAUSED";

type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: ClientStatus;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  preference: {
    city: string;
    state: string;
    scope: "PORTFOLIO" | "MARKET";
    updatedAt: string | null;
  } | null;
};

type ApiResponse = {
  success: boolean;
  team: { id: string; name: string } | null;
  clients: ClientRow[];
  page: number;
  pageSize: number;
  total: number;
  error?: string;
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

type PreferencePutResponse = {
  success: boolean;
  preference?: any;
  error?: string;
  issues?: any;
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

function formatCurrency(value: string) {
  if (!value) return "";
  const num = parseInt(String(value).replace(/\D/g, ""), 10);
  if (Number.isNaN(num)) return "";
  return num.toLocaleString("pt-BR");
}

function parseCurrency(value: string) {
  return String(value || "").replace(/\D/g, "");
}

type CreateResponse = {
  success: boolean;
  client?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: ClientStatus;
    notes: string | null;
  };
  error?: string;
};

type ClientDetailsResponse = {
  success: boolean;
  client?: ClientRow;
  error?: string;
};

function roleFromSession(session: any) {
  return session?.user?.role || session?.role || "USER";
}

export default function AgencyClientsPage() {
  const { data: session, status } = useSession();

  const router = useRouter();
  const searchParams = useSearchParams();

  const role = useMemo(() => roleFromSession(session as any), [session]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string>("Clientes");

  const [forceTour, setForceTour] = useState(false);
  const [tourSeed, setTourSeed] = useState(0);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(24);
  const [total, setTotal] = useState<number>(0);

  const [qDraft, setQDraft] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "ALL">("ALL");

  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [prefCity, setPrefCity] = useState("");
  const [prefState, setPrefState] = useState("");
  const [selectedCity, setSelectedCity] = useState<{ city: string; state: string } | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<LocationSuggestion[]>([]);
  const [citySuggestOpen, setCitySuggestOpen] = useState(false);

  const [prefNeighborhoodDraft, setPrefNeighborhoodDraft] = useState("");
  const [prefNeighborhoodTags, setPrefNeighborhoodTags] = useState<string[]>([]);
  const [hoodSuggestions, setHoodSuggestions] = useState<LocationSuggestion[]>([]);
  const [hoodSuggestOpen, setHoodSuggestOpen] = useState(false);

  const [prefPurpose, setPrefPurpose] = useState<"SALE" | "RENT" | "">("");
  const [prefScope, setPrefScope] = useState<"PORTFOLIO" | "MARKET">("PORTFOLIO");
  const [prefTypes, setPrefTypes] = useState<string[]>([]);

  const [prefMinPrice, setPrefMinPrice] = useState("");
  const [prefMaxPrice, setPrefMaxPrice] = useState("");
  const [prefBedroomsMin, setPrefBedroomsMin] = useState("");
  const [prefBathroomsMin, setPrefBathroomsMin] = useState("");
  const [prefAreaMin, setPrefAreaMin] = useState("");

  const [createError, setCreateError] = useState<string | null>(null);

  const [selectedOpen, setSelectedOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);

  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [editPrefCity, setEditPrefCity] = useState("");
  const [editPrefState, setEditPrefState] = useState("");
  const [editSelectedCity, setEditSelectedCity] = useState<{ city: string; state: string } | null>(null);
  const [editCitySuggestions, setEditCitySuggestions] = useState<LocationSuggestion[]>([]);
  const [editCitySuggestOpen, setEditCitySuggestOpen] = useState(false);

  const [editPrefNeighborhoodDraft, setEditPrefNeighborhoodDraft] = useState("");
  const [editPrefNeighborhoodTags, setEditPrefNeighborhoodTags] = useState<string[]>([]);
  const [editHoodSuggestions, setEditHoodSuggestions] = useState<LocationSuggestion[]>([]);
  const [editHoodSuggestOpen, setEditHoodSuggestOpen] = useState(false);

  const [editPrefPurpose, setEditPrefPurpose] = useState<"SALE" | "RENT" | "">("");
  const [editPrefScope, setEditPrefScope] = useState<"PORTFOLIO" | "MARKET">("PORTFOLIO");
  const [editPrefTypes, setEditPrefTypes] = useState<string[]>([]);

  const [editPrefMinPrice, setEditPrefMinPrice] = useState("");
  const [editPrefMaxPrice, setEditPrefMaxPrice] = useState("");
  const [editPrefBedroomsMin, setEditPrefBedroomsMin] = useState("");
  const [editPrefBathroomsMin, setEditPrefBathroomsMin] = useState("");
  const [editPrefAreaMin, setEditPrefAreaMin] = useState("");

  const canUse = role === "AGENCY" || role === "ADMIN";

  const clearClientParam = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("client");
    const qs = next.toString();
    router.replace(qs ? `/agency/clients?${qs}` : `/agency/clients`);
  };

  const closeSelected = () => {
    setSelectedOpen(false);
    setSelectedClientId(null);
    setSelectedLoading(false);
    setSelectedError(null);

    setEditing(false);

    setEditName("");
    setEditEmail("");
    setEditPhone("");
    setEditNotes("");

    setEditPrefCity("");
    setEditPrefState("");
    setEditSelectedCity(null);
    setEditCitySuggestions([]);
    setEditCitySuggestOpen(false);

    setEditPrefNeighborhoodDraft("");
    setEditPrefNeighborhoodTags([]);
    setEditHoodSuggestions([]);
    setEditHoodSuggestOpen(false);

    setEditPrefPurpose("");
    setEditPrefScope("PORTFOLIO");
    setEditPrefTypes([]);

    setEditPrefMinPrice("");
    setEditPrefMaxPrice("");
    setEditPrefBedroomsMin("");
    setEditPrefBathroomsMin("");
    setEditPrefAreaMin("");

    try {
      clearClientParam();
    } catch {
    }
  };

  const openSelected = async (clientId: string, opts?: { pushUrl?: boolean }) => {
    const id = String(clientId || "").trim();
    if (!id) return;

    setSelectedClientId(id);
    setSelectedOpen(true);
    setSelectedError(null);

    if (opts?.pushUrl) {
      const next = new URLSearchParams(searchParams.toString());
      next.set("client", id);
      const qs = next.toString();
      router.replace(qs ? `/agency/clients?${qs}` : `/agency/clients`);
    }

    try {
      setSelectedLoading(true);
      const res = await fetch(`/api/agency/clients/${encodeURIComponent(id)}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ClientDetailsResponse | null;

      if (!res.ok || !json?.success || !json?.client?.id) {
        throw new Error(json?.error || "Não conseguimos carregar o cliente agora.");
      }

      const c: any = json.client;

      setEditName(String(c.name || ""));
      setEditEmail(String(c.email || ""));
      setEditPhone(String(c.phone || ""));
      setEditNotes(String(c.notes || ""));

      const pref = c.preference || null;
      const city = pref?.city ? String(pref.city) : "";
      const state = pref?.state ? String(pref.state) : "";
      setEditPrefCity(city);
      setEditPrefState(state);
      setEditSelectedCity(city && state ? { city, state } : null);

      setEditPrefNeighborhoodTags(Array.isArray(pref?.neighborhoods) ? pref.neighborhoods.map((x: any) => String(x)) : []);
      setEditPrefNeighborhoodDraft("");
      setEditPrefPurpose(pref?.purpose === "SALE" || pref?.purpose === "RENT" ? pref.purpose : "");
      setEditPrefScope(pref?.scope === "MARKET" ? "MARKET" : "PORTFOLIO");
      setEditPrefTypes(
        Array.isArray(pref?.types)
          ? pref.types.map((x: any) => String(x)).filter((t: string) => !REMOVED_TYPES.has(t))
          : []
      );
      setEditPrefMinPrice(pref?.minPrice != null ? String(Math.round(Number(pref.minPrice) / 100)) : "");
      setEditPrefMaxPrice(pref?.maxPrice != null ? String(Math.round(Number(pref.maxPrice) / 100)) : "");
      setEditPrefBedroomsMin(pref?.bedroomsMin != null ? String(pref.bedroomsMin) : "");
      setEditPrefBathroomsMin(pref?.bathroomsMin != null ? String(pref.bathroomsMin) : "");
      setEditPrefAreaMin(pref?.areaMin != null ? String(pref.areaMin) : "");
    } catch (e: any) {
      setSelectedError(e?.message || "Não conseguimos carregar o cliente agora.");
    } finally {
      setSelectedLoading(false);
    }
  };

  const fetchClients = async (opts?: { silent?: boolean; page?: number }) => {
    try {
      setError(null);
      if (!opts?.silent) setLoading(true);

      const p = typeof opts?.page === "number" ? opts.page : page;

      const qs = new URLSearchParams();
      qs.set("page", String(p));
      qs.set("pageSize", String(pageSize));
      if (qDraft.trim()) qs.set("q", qDraft.trim());
      if (statusFilter !== "ALL") qs.set("status", statusFilter);

      const res = await fetch(`/api/agency/clients?${qs.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Não conseguimos carregar os clientes agora.");
      }

      setTeamName(json.team?.name ? `Clientes — ${json.team.name}` : "Clientes");
      setClients(Array.isArray(json.clients) ? json.clients : []);
      setTotal(typeof json.total === "number" ? json.total : 0);
      setPage(typeof json.page === "number" ? json.page : p);
    } catch (e: any) {
      setError(e?.message || "Não conseguimos carregar os clientes agora.");
      setClients([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const deleteClient = async (clientId: string) => {
    const id = String(clientId || "").trim();
    if (!id) return;

    const ok = window.confirm("Excluir este cliente? Essa ação não pode ser desfeita.");
    if (!ok) return;

    try {
      setDeletingClientId(id);

      const res = await fetch(`/api/agency/clients/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => null)) as any;

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Não conseguimos excluir o cliente agora.");
      }

      if (selectedOpen && selectedClientId === id) {
        closeSelected();
      }

      await fetchClients({ silent: true, page: 1 });
    } catch (e: any) {
      window.alert(e?.message || "Não conseguimos excluir o cliente agora.");
    } finally {
      setDeletingClientId(null);
    }
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!canUse) {
      setLoading(false);
      return;
    }
    void fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, canUse]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!canUse) return;
    const raw = searchParams.get("client") ? String(searchParams.get("client")) : "";
    const id = raw.trim();
    if (!id) return;
    if (selectedOpen && selectedClientId === id) return;
    void openSelected(id, { pushUrl: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, canUse, searchParams]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!canUse) return;
    const t = window.setTimeout(() => {
      void fetchClients({ silent: true, page: 1 });
    }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDraft, statusFilter]);

  const totalPages = useMemo(() => {
    const safeTotal = Math.max(0, total);
    return Math.max(1, Math.ceil(safeTotal / pageSize));
  }, [total, pageSize]);

  const pageSummary = useMemo(() => {
    const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = Math.min(total, page * pageSize);
    return { start, end };
  }, [page, pageSize, total]);

  const statusCounts = useMemo(() => {
    const active = clients.filter((c) => c.status === "ACTIVE").length;
    const paused = clients.filter((c) => c.status === "PAUSED").length;
    return { active, paused };
  }, [clients]);

  const resetCreate = () => {
    setCreateName("");
    setCreateEmail("");
    setCreatePhone("");
    setCreateNotes("");
    setPrefCity("");
    setPrefState("");
    setSelectedCity(null);
    setCitySuggestions([]);
    setCitySuggestOpen(false);
    setPrefNeighborhoodDraft("");
    setPrefNeighborhoodTags([]);
    setHoodSuggestions([]);
    setHoodSuggestOpen(false);
    setPrefPurpose("");
    setPrefScope("PORTFOLIO");
    setPrefTypes([]);
    setPrefMinPrice("");
    setPrefMaxPrice("");
    setPrefBedroomsMin("");
    setPrefBathroomsMin("");
    setPrefAreaMin("");
    setCreateError(null);
  };

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
    const q = editPrefCity.trim();
    if (!q) {
      setEditCitySuggestions([]);
      return;
    }

    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/locations?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as LocationsResponse | null;
        const suggestions = Array.isArray(json?.suggestions) ? json!.suggestions! : [];
        const cityOnly = suggestions.filter((s) => !s.neighborhood);
        setEditCitySuggestions(cityOnly.slice(0, 8));
      } catch {
        setEditCitySuggestions([]);
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [editPrefCity, canUse]);

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

  useEffect(() => {
    if (!canUse) return;
    if (!editSelectedCity) {
      setEditHoodSuggestions([]);
      return;
    }

    const query = editPrefNeighborhoodDraft.trim();
    const q = query ? query : editSelectedCity.city;

    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/locations?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as LocationsResponse | null;
        const suggestions = Array.isArray(json?.suggestions) ? json!.suggestions! : [];
        const hoods = suggestions
          .filter((s) => !!s.neighborhood)
          .filter((s) => String(s.city) === editSelectedCity.city && String(s.state) === editSelectedCity.state)
          .filter((s) => !editPrefNeighborhoodTags.includes(String(s.neighborhood)))
          .slice(0, 10);
        setEditHoodSuggestions(hoods);
      } catch {
        setEditHoodSuggestions([]);
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [editPrefNeighborhoodDraft, editSelectedCity, canUse, editPrefNeighborhoodTags]);

  const submitCreate = async () => {
    try {
      setCreateError(null);
      const name = createName.trim();
      if (!name) {
        setCreateError("Informe o nome do cliente.");
        return;
      }

      const city = prefCity.trim();
      const state = prefState.trim();
      if (!city || !state) {
        setCreateError("Selecione uma cidade (com estado) nas preferências.");
        return;
      }

      setCreating(true);

      const payload: any = { name };
      if (createEmail.trim()) payload.email = createEmail.trim();
      if (createPhone.trim()) payload.phone = createPhone.trim();
      if (createNotes.trim()) payload.notes = createNotes.trim();

      const res = await fetch("/api/agency/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as CreateResponse | null;

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Não conseguimos criar o cliente agora.");
      }

      const createdId = String(json?.client?.id || "");
      if (!createdId) {
        throw new Error("Cliente criado, mas não recebemos o ID.");
      }

      const prefPayload: any = {
        city,
        state,
        neighborhoods: prefNeighborhoodTags,
        purpose: prefPurpose ? prefPurpose : null,
        types: (prefTypes || []).filter((t) => !REMOVED_TYPES.has(String(t))),
        minPrice: prefMinPrice.trim() ? Math.max(0, Math.round(Number(prefMinPrice))) * 100 : null,
        maxPrice: prefMaxPrice.trim() ? Math.max(0, Math.round(Number(prefMaxPrice))) * 100 : null,
        bedroomsMin: prefBedroomsMin.trim() ? Math.max(0, Math.round(Number(prefBedroomsMin))) : null,
        bathroomsMin: prefBathroomsMin.trim() ? Math.max(0, Number(prefBathroomsMin)) : null,
        areaMin: prefAreaMin.trim() ? Math.max(0, Math.round(Number(prefAreaMin))) : null,
        scope: prefScope,
      };

      const prefRes = await fetch(`/api/agency/clients/${encodeURIComponent(createdId)}/preference`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefPayload),
      });
      const prefJson = (await prefRes.json().catch(() => null)) as PreferencePutResponse | null;
      if (!prefRes.ok || !prefJson?.success) {
        throw new Error(prefJson?.error || "Cliente criado, mas não conseguimos salvar as preferências.");
      }

      resetCreate();
      setCreateOpen(false);
      await fetchClients({ silent: true, page: 1 });
    } catch (e: any) {
      setCreateError(e?.message || "Não conseguimos criar o cliente agora.");
    } finally {
      setCreating(false);
    }
  };

  const submitEdit = async () => {
    try {
      setSelectedError(null);
      const clientId = String(selectedClientId || "").trim();
      if (!clientId) return;

      const name = editName.trim();
      if (!name) {
        setSelectedError("Informe o nome do cliente.");
        return;
      }

      const city = editPrefCity.trim();
      const state = editPrefState.trim();
      if (!city || !state) {
        setSelectedError("Selecione uma cidade (com estado) nas preferências.");
        return;
      }

      setEditing(true);

      const updatePayload: any = { name };
      updatePayload.email = editEmail.trim() ? editEmail.trim() : null;
      updatePayload.phone = editPhone.trim() ? editPhone.trim() : null;
      updatePayload.notes = editNotes.trim() ? editNotes.trim() : null;

      const res = await fetch(`/api/agency/clients/${encodeURIComponent(clientId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Não conseguimos salvar o cliente agora.");
      }

      const prefPayload: any = {
        city,
        state,
        neighborhoods: editPrefNeighborhoodTags,
        purpose: editPrefPurpose ? editPrefPurpose : null,
        types: (editPrefTypes || []).filter((t) => !REMOVED_TYPES.has(String(t))),
        minPrice: editPrefMinPrice.trim() ? Math.max(0, Math.round(Number(editPrefMinPrice))) * 100 : null,
        maxPrice: editPrefMaxPrice.trim() ? Math.max(0, Math.round(Number(editPrefMaxPrice))) * 100 : null,
        bedroomsMin: editPrefBedroomsMin.trim() ? Math.max(0, Math.round(Number(editPrefBedroomsMin))) : null,
        bathroomsMin: editPrefBathroomsMin.trim() ? Math.max(0, Number(editPrefBathroomsMin)) : null,
        areaMin: editPrefAreaMin.trim() ? Math.max(0, Math.round(Number(editPrefAreaMin))) : null,
        scope: editPrefScope,
      };

      const prefRes = await fetch(`/api/agency/clients/${encodeURIComponent(clientId)}/preference`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefPayload),
      });
      const prefJson = (await prefRes.json().catch(() => null)) as any;
      if (!prefRes.ok || !prefJson?.success) {
        throw new Error(prefJson?.error || "Não conseguimos salvar as preferências agora.");
      }

      await fetchClients({ silent: true });
      closeSelected();
    } catch (e: any) {
      setSelectedError(e?.message || "Não conseguimos salvar o cliente agora.");
    } finally {
      setEditing(false);
    }
  };

  if (status === "loading" || loading) {
    return <CenteredSpinner message="Carregando clientes..." />;
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

  if (error) {
    return (
      <EmptyState
        title="Erro ao carregar clientes"
        description={error}
        action={
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold"
          >
            Tentar novamente
          </button>
        }
      />
    );
  }

  return (
    <div className="py-2 space-y-6">
      <AgencyClientsOnboarding
        key={`agency-clients-tour-${tourSeed}`}
        forceShow={forceTour}
        onFinish={() => {
          setForceTour(false);
        }}
      />

      <div
        className="rounded-3xl border border-gray-200/70 bg-white/70 backdrop-blur p-4 shadow-soft"
        data-onboarding="agency-clients-filters"
      >
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <input
                value={qDraft}
                onChange={(e) => setQDraft(String(e.target.value))}
                placeholder="Nome, e-mail, telefone..."
                className="w-full pl-3 pr-10 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
              />
              {qDraft ? (
                <button
                  type="button"
                  onClick={() => setQDraft("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200/70 bg-white/80 hover:bg-white"
                  aria-label="Limpar busca"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="w-full lg:w-56">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ClientStatus | "ALL")}
              className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
            >
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Ativos</option>
              <option value="PAUSED">Pausados</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setQDraft("");
              setStatusFilter("ALL");
            }}
            disabled={!qDraft && statusFilter === "ALL"}
            className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm font-semibold text-gray-700 hover:bg-white disabled:opacity-60"
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-onboarding="agency-clients-metrics">
        <div className="rounded-3xl border border-gray-200/70 bg-white/70 backdrop-blur p-4 shadow-soft">
          <div className="text-[11px] font-semibold text-gray-500">Clientes</div>
          <div className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">{total}</div>
          <div className="mt-1 text-xs text-gray-500">No time</div>
        </div>
        <div className="rounded-3xl border border-gray-200/70 bg-white/70 backdrop-blur p-4 shadow-soft">
          <div className="text-[11px] font-semibold text-gray-500">Ativos</div>
          <div className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">{statusCounts.active}</div>
          <div className="mt-1 text-xs text-gray-500">Na página atual</div>
        </div>
        <div className="rounded-3xl border border-gray-200/70 bg-white/70 backdrop-blur p-4 shadow-soft">
          <div className="text-[11px] font-semibold text-gray-500">Pausados</div>
          <div className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">{statusCounts.paused}</div>
          <div className="mt-1 text-xs text-gray-500">Na página atual</div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200/70 bg-white/70 backdrop-blur p-5 shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">{teamName}</div>
            <div className="mt-1 text-xs text-gray-500">Clientes vinculados ao time (visão da agência).</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                resetAgencyClientsOnboarding();
                setTourSeed((v) => v + 1);
                setForceTour(true);
              }}
              className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-50"
            >
              Fazer tour
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              disabled={creating}
              className="inline-flex items-center justify-center px-3 py-2 rounded-xl glass-teal btn-modern text-white text-sm font-semibold disabled:opacity-70"
              data-onboarding="agency-clients-create"
            >
              <Plus className="w-4 h-4 mr-2" />
              Cliente
            </button>
          </div>
        </div>

        <div className="mt-6" data-onboarding="agency-clients-list">
          {clients.length === 0 ? (
            <EmptyState
              icon={<UserRound className="w-10 h-10 text-gray-400" />}
              title="Nenhum cliente encontrado"
              description="Crie seu primeiro cliente acima ou ajuste os filtros."
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div>
                  Mostrando {pageSummary.start}-{pageSummary.end} de {total}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (page <= 1) return;
                      void fetchClients({ silent: true, page: page - 1 });
                    }}
                    disabled={page <= 1}
                    className="px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Anterior
                  </button>
                  <div className="text-gray-600">
                    Página {page} de {totalPages}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (page >= totalPages) return;
                      void fetchClients({ silent: true, page: page + 1 });
                    }}
                    disabled={page >= totalPages}
                    className="px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Próxima
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {clients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => void openSelected(c.id, { pushUrl: true })}
                    className="block w-full text-left rounded-2xl border border-gray-200/70 bg-white/80 p-4 hover:bg-white hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{c.name}</div>
                        <div className="mt-1 flex flex-col gap-1 text-xs text-gray-600">
                          {c.email ? (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-gray-400" />
                              <span className="truncate">{c.email}</span>
                            </div>
                          ) : null}
                          {c.phone ? (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              <span className="truncate">{c.phone}</span>
                            </div>
                          ) : null}
                          {c.preference?.city && c.preference?.state ? (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              <span className="truncate">
                                {c.preference.city}/{c.preference.state} · {c.preference.scope}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void deleteClient(c.id);
                          }}
                          disabled={deletingClientId === c.id}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200/70 bg-white/80 hover:bg-white text-gray-600 hover:text-rose-700 disabled:opacity-60"
                          aria-label="Excluir cliente"
                          title="Excluir cliente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold border ${
                            c.status === "ACTIVE"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-amber-200 bg-amber-50 text-amber-800"
                          }`}
                        >
                          {c.status === "ACTIVE" ? "Ativo" : "Pausado"}
                        </div>
                      </div>
                    </div>

                    {c.notes ? <div className="mt-3 text-xs text-gray-500 line-clamp-2">{c.notes}</div> : null}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Drawer
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          resetCreate();
        }}
        title="Novo cliente"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitCreate();
          }}
          className="space-y-4"
        >
          <div className="rounded-2xl border border-gray-200/70 bg-white/70 backdrop-blur p-4 shadow-soft">
            <div className="text-sm font-semibold text-gray-900">Dados do cliente</div>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nome</label>
                <input
                  value={createName}
                  onChange={(e) => setCreateName(String(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
                  placeholder="Ex: Maria Silva"
                  autoComplete="name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail (opcional)</label>
                <input
                  value={createEmail}
                  onChange={(e) => setCreateEmail(String(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
                  placeholder="maria@email.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Telefone (opcional)</label>
                <input
                  value={createPhone}
                  onChange={(e) => setCreatePhone(String(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
                  placeholder="(11) 99999-9999"
                  autoComplete="tel"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Observações (opcional)</label>
                <textarea
                  value={createNotes}
                  onChange={(e) => setCreateNotes(String(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm min-h-[90px]"
                  placeholder="Preferências gerais, contexto do atendimento..."
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200/70 bg-white/70 backdrop-blur p-4 shadow-soft">
            <div className="text-sm font-semibold text-gray-900">Preferências</div>
            <div className="mt-3 grid grid-cols-1 gap-3">
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

              <div>
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
                  value={prefPurpose}
                  onChange={(e) => setPrefPurpose(e.target.value as any)}
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

              <div>
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

              <div>
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

              <div className="grid grid-cols-3 gap-3">
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
            </div>
          </div>

          {createError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {createError}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setCreateOpen(false);
                resetCreate();
              }}
              className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm font-semibold text-gray-700 hover:bg-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center justify-center px-3 py-2 rounded-xl glass-teal btn-modern text-white text-sm font-semibold disabled:opacity-70"
            >
              {creating ? "Criando..." : "Criar cliente"}
            </button>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={selectedOpen}
        onClose={closeSelected}
        title={selectedClientId ? "Cliente" : "Cliente"}
      >
        {selectedLoading ? (
          <div className="py-10">
            <CenteredSpinner message="Carregando cliente..." />
          </div>
        ) : selectedError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{selectedError}</div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitEdit();
            }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-gray-200/70 bg-white/70 backdrop-blur p-4 shadow-soft">
              <div className="text-sm font-semibold text-gray-900">Dados do cliente</div>
              <div className="mt-3 grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nome</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(String(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
                    placeholder="Ex: Maria Silva"
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail (opcional)</label>
                  <input
                    value={editEmail}
                    onChange={(e) => setEditEmail(String(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
                    placeholder="maria@email.com"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Telefone (opcional)</label>
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(String(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
                    placeholder="(11) 99999-9999"
                    autoComplete="tel"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Observações (opcional)</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(String(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm min-h-[90px]"
                    placeholder="Preferências gerais, contexto do atendimento..."
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200/70 bg-white/70 backdrop-blur p-4 shadow-soft">
              <div className="text-sm font-semibold text-gray-900">Preferências</div>
              <div className="mt-3 grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cidade</label>
                  <div className="relative">
                    <input
                      value={editPrefCity}
                      onChange={(e) => {
                        setEditPrefCity(String(e.target.value));
                        setEditCitySuggestOpen(true);
                        setEditSelectedCity(null);
                        setEditPrefState("");
                        setEditPrefNeighborhoodTags([]);
                        setEditPrefNeighborhoodDraft("");
                      }}
                      onFocus={() => setEditCitySuggestOpen(true)}
                      onBlur={() => {
                        window.setTimeout(() => setEditCitySuggestOpen(false), 160);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
                      placeholder="Ex: São Paulo"
                    />

                    {editCitySuggestOpen && editCitySuggestions.length ? (
                      <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                        {editCitySuggestions.map((s) => {
                          const key = `${s.city}__${s.state}`;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                setEditPrefCity(String(s.city));
                                setEditPrefState(String(s.state));
                                setEditSelectedCity({ city: String(s.city), state: String(s.state) });
                                setEditCitySuggestOpen(false);
                                setEditPrefNeighborhoodTags([]);
                                setEditPrefNeighborhoodDraft("");
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
                    value={editPrefState}
                    readOnly
                    className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
                    placeholder="Ex: SP"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Bairros</label>
                  <div className="relative">
                    <input
                      value={editPrefNeighborhoodDraft}
                      onChange={(e) => {
                        setEditPrefNeighborhoodDraft(String(e.target.value));
                        setEditHoodSuggestOpen(true);
                      }}
                      onFocus={() => setEditHoodSuggestOpen(true)}
                      onBlur={() => {
                        window.setTimeout(() => setEditHoodSuggestOpen(false), 160);
                      }}
                      disabled={!editSelectedCity}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm disabled:bg-gray-50"
                      placeholder={editSelectedCity ? "Digite para buscar bairros" : "Selecione uma cidade primeiro"}
                    />

                    {editHoodSuggestOpen && editHoodSuggestions.length ? (
                      <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                        {editHoodSuggestions.map((s) => {
                          const hood = String(s.neighborhood || "");
                          if (!hood) return null;
                          return (
                            <button
                              key={`${editSelectedCity?.city}__${editSelectedCity?.state}__${hood}`}
                              type="button"
                              onClick={() => {
                                setEditPrefNeighborhoodTags((prev) => {
                                  const next = Array.isArray(prev) ? [...prev] : [];
                                  if (next.includes(hood)) return next;
                                  return [...next, hood].slice(0, 100);
                                });
                                setEditPrefNeighborhoodDraft("");
                                setEditHoodSuggestOpen(false);
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

                  {editPrefNeighborhoodTags.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {editPrefNeighborhoodTags.map((n) => (
                        <div
                          key={n}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700"
                        >
                          <span className="max-w-[220px] truncate">{n}</span>
                          <button
                            type="button"
                            onClick={() => setEditPrefNeighborhoodTags((prev) => prev.filter((x) => x !== n))}
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
                    value={editPrefPurpose}
                    onChange={(e) => setEditPrefPurpose(e.target.value as any)}
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
                    value={editPrefScope}
                    onChange={(e) => setEditPrefScope(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
                  >
                    <option value="PORTFOLIO">PORTFOLIO</option>
                    <option value="MARKET">MARKET</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tipos</label>
                  <div className="flex flex-wrap gap-2">
                    {PROPERTY_TYPES.map((t) => {
                      const active = editPrefTypes.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setEditPrefTypes((prev) => {
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

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-700">Preço</label>
                    <div className="text-[11px] text-gray-500">
                      {editPrefMinPrice.trim() ? `De R$ ${formatCurrency(editPrefMinPrice)}` : "Sem mínimo"} ·{" "}
                      {editPrefMaxPrice.trim() ? `Até R$ ${formatCurrency(editPrefMaxPrice)}` : "Sem máximo"}
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
                          value={formatCurrency(editPrefMinPrice)}
                          onChange={(e) => setEditPrefMinPrice(parseCurrency(e.target.value))}
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
                          value={formatCurrency(editPrefMaxPrice)}
                          onChange={(e) => setEditPrefMaxPrice(parseCurrency(e.target.value))}
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
                      minValue={editPrefMinPrice.trim() ? Number(editPrefMinPrice) : null}
                      maxValue={editPrefMaxPrice.trim() ? Number(editPrefMaxPrice) : null}
                      onPreviewChange={({ min, max }) => {
                        setEditPrefMinPrice(min == null ? "" : String(min));
                        setEditPrefMaxPrice(max == null ? "" : String(max));
                      }}
                      onChange={({ min, max }) => {
                        setEditPrefMinPrice(min == null ? "" : String(min));
                        setEditPrefMaxPrice(max == null ? "" : String(max));
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Quartos mín.</label>
                    <input
                      value={editPrefBedroomsMin}
                      onChange={(e) => setEditPrefBedroomsMin(String(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
                      inputMode="numeric"
                      placeholder="Ex: 2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Banheiros mín.</label>
                    <input
                      value={editPrefBathroomsMin}
                      onChange={(e) => setEditPrefBathroomsMin(String(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
                      inputMode="decimal"
                      placeholder="Ex: 2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Área mín. (m²)</label>
                    <input
                      value={editPrefAreaMin}
                      onChange={(e) => setEditPrefAreaMin(String(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm"
                      inputMode="numeric"
                      placeholder="Ex: 70"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeSelected}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200/70 bg-white/80 text-sm font-semibold text-gray-700 hover:bg-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={editing}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl glass-teal btn-modern text-white text-sm font-semibold disabled:opacity-70"
              >
                {editing ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        )}
      </Drawer>
    </div>
  );
}
