"use client";

import { Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ModernNavbar } from "@/components/modern";

function AcceptTeamInviteInner() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      const callbackUrl = token
        ? `/team-invites/accept?token=${encodeURIComponent(token)}`
        : "/team-invites/accept";
      router.push(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [status, router, token]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!token) {
      setError("Token inválido.");
      return;
    }

    let cancelled = false;

    async function accept() {
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const res = await fetch(`/api/team-invites/accept?token=${encodeURIComponent(token ?? "")}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Não conseguimos aceitar este convite agora.");
        }

        if (cancelled) return;

        const teamId = data.teamId as string | undefined;
        const teamName = (data.teamName as string | null | undefined) || "time";

        setSuccess(`Convite aceito! Você entrou no ${teamName}.`);

        if (teamId) {
          setTimeout(() => {
            router.push(`/broker/teams/${teamId}/crm`);
          }, 900);
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Não conseguimos aceitar este convite agora.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    accept();

    return () => {
      cancelled = true;
    };
  }, [status, token, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50">
        <ModernNavbar forceLight />
        <div className="mt-24 flex items-center justify-center text-gray-500 text-sm">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernNavbar forceLight />
      <main className="mt-20 flex justify-center px-4 pb-16">
        <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-lg p-6 sm:p-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Aceitar convite</h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-600">
            Estamos validando seu convite e adicionando você ao time.
          </p>

          {loading && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
              Processando...
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              {success}
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <Link
              href="/broker/teams"
              className="text-xs text-gray-600 hover:text-gray-900 underline"
            >
              Ver meus times
            </Link>
            <Link
              href="/start"
              className="text-xs text-gray-600 hover:text-gray-900 underline"
            >
              Ir para o início
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AcceptTeamInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50">
          <ModernNavbar forceLight />
          <div className="mt-24 flex items-center justify-center text-gray-500 text-sm">Carregando...</div>
        </div>
      }
    >
      <AcceptTeamInviteInner />
    </Suspense>
  );
}
