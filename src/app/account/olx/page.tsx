"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ModernNavbar } from "@/components/modern";
import SiteFooter from "@/components/Footer";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type OlxAccountResponse = {
  success?: boolean;
  account?: {
    id: string;
    teamId: string | null;
    userId: string | null;
    scopes: string[];
    leadConfigId: string | null;
    chatWebhookEnabled: boolean;
    notificationConfigId: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export default function OlxSettingsPage() {
  const { data: session, status } = useSession();

  const role = useMemo(() => {
    const s: any = session as any;
    return String(s?.user?.role || s?.role || "USER");
  }, [session]);

  const [teamId, setTeamId] = useState("");
  const [propertyId, setPropertyId] = useState("");

  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<OlxAccountResponse["account"]>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const effectiveTeamId = teamId.trim() || null;

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        if (role === "AGENCY") {
          const profileRes = await fetch("/api/agency/profile");
          const profileJson = await profileRes.json().catch(() => null);
          const tid = String(profileJson?.agencyProfile?.teamId || "").trim();
          if (tid) setTeamId(tid);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [role, status]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const loadAccount = async () => {
      setError(null);
      try {
        const url = effectiveTeamId ? `/api/olx/account?teamId=${encodeURIComponent(effectiveTeamId)}` : "/api/olx/account";
        const res = await fetch(url);
        const json: OlxAccountResponse = await res.json().catch(() => ({}));
        setAccount(json?.account ?? null);
      } catch {
        setAccount(null);
      }
    };

    loadAccount();
  }, [effectiveTeamId, status]);

  const connect = () => {
    setError(null);
    const returnTo = "/account/olx";
    const qs = new URLSearchParams();
    qs.set("returnTo", returnTo);
    if (effectiveTeamId) qs.set("teamId", effectiveTeamId);
    window.location.href = `/api/olx/connect?${qs.toString()}`;
  };

  const call = async (path: string, body?: any) => {
    setError(null);
    setResult(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : "{}",
      });
      const json = await res.json().catch(() => null);
      setResult({ status: res.status, json });
      if (!res.ok) {
        setError(String(json?.error || "Request failed"));
      }
    } catch (e: any) {
      setError(e?.message || "Request failed");
    }
  };

  const publish = async () => {
    if (!propertyId.trim()) {
      setError("Informe o propertyId");
      return;
    }
    await call("/api/olx/listings/publish", { propertyId: propertyId.trim(), teamId: effectiveTeamId || undefined });
  };

  const importStatus = async () => {
    if (!propertyId.trim()) {
      setError("Informe o propertyId");
      return;
    }
    await call("/api/olx/listings/import-status", { propertyId: propertyId.trim(), teamId: effectiveTeamId || undefined });
  };

  const adStatus = async () => {
    if (!propertyId.trim()) {
      setError("Informe o propertyId");
      return;
    }
    await call("/api/olx/listings/ad-status", { propertyId: propertyId.trim(), teamId: effectiveTeamId || undefined });
  };

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gray-50">
        <ModernNavbar forceLight />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className="min-h-screen bg-gray-50">
        <ModernNavbar forceLight />
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h1 className="text-2xl font-bold text-gray-900">OLX</h1>
          <p className="mt-2 text-gray-600">Faça login para conectar sua conta OLX.</p>
          <div className="mt-6">
            <Link href="/api/auth/signin" className="inline-flex">
              <Button>Fazer login</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <ModernNavbar forceLight />

      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Integração OLX</h1>
            <p className="mt-1 text-sm text-gray-600">Conectar OLX e testar publicação e status.</p>
          </div>
          <Link href="/account" className="text-sm text-gray-600 hover:text-gray-900">Voltar</Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold text-gray-900">Conexão</div>
            <div className="mt-2 text-sm text-gray-600">Role atual: {role}</div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="teamId (opcional)"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                placeholder="Se for conectar no contexto da agência/time"
              />

              <div className="flex items-end">
                <Button onClick={connect} className="w-full">Conectar OLX</Button>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
              {loading ? "Carregando..." : account?.id ? (
                <div>
                  <div><span className="font-semibold">Status:</span> Conectado</div>
                  <div className="mt-1"><span className="font-semibold">Scopes:</span> {(account.scopes || []).join(" ") || "-"}</div>
                  <div className="mt-1"><span className="font-semibold">Lead config:</span> {account.leadConfigId || "-"}</div>
                  <div className="mt-1"><span className="font-semibold">Chat webhook:</span> {account.chatWebhookEnabled ? "enabled" : "disabled"}</div>
                  <div className="mt-1"><span className="font-semibold">Notification config:</span> {account.notificationConfigId || "-"}</div>
                </div>
              ) : (
                <div>
                  <div><span className="font-semibold">Status:</span> Não conectado</div>
                  <div className="mt-1 text-gray-600">Clique em “Conectar OLX” para iniciar o OAuth.</div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold text-gray-900">Autoupload</div>
            <div className="mt-2 text-sm text-gray-600">Informe um `propertyId` existente para publicar e checar status.</div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="propertyId"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                placeholder="cuid do imóvel"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button onClick={publish} className="w-full">Publish</Button>
                <Button onClick={importStatus} variant="secondary" className="w-full">Import status</Button>
                <Button onClick={adStatus} variant="secondary" className="w-full">Ad status</Button>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
            ) : null}

            {result ? (
              <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-xs text-gray-700 overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            ) : null}
          </div>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
