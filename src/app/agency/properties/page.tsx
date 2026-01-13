"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";
import PropertyCardV2 from "@/components/dashboard/PropertyCardV2";

type PropertyStatus = "ACTIVE" | "PAUSED" | "DRAFT";

type AgencyProperty = {
  id: string;
  title: string;
  price: number;
  status: PropertyStatus;
  type: string;
  city: string;
  state: string;
  street: string;
  neighborhood: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaM2: number | null;
  image: string | null;
  views: number;
  leads: number;
  favorites: number;
};

type ApiResponse = {
  success: boolean;
  team: { id: string; name: string } | null;
  properties: AgencyProperty[];
  error?: string;
};

export default function AgencyPropertiesPage() {
  const { status } = useSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string>("Imóveis");
  const [properties, setProperties] = useState<AgencyProperty[]>([]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const r = await fetch("/api/agency/properties", { cache: "no-store" });
        const j = (await r.json().catch(() => null)) as ApiResponse | null;

        if (!r.ok || !j?.success) {
          throw new Error(j?.error || "Não conseguimos carregar os imóveis agora.");
        }

        setTeamName(j.team?.name ? `Imóveis — ${j.team.name}` : "Imóveis");
        setProperties(Array.isArray(j.properties) ? j.properties : []);
      } catch (e: any) {
        setError(e?.message || "Não conseguimos carregar os imóveis agora.");
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [status]);

  const title = useMemo(() => teamName, [teamName]);

  if (status === "loading" || loading) {
    return <CenteredSpinner message="Carregando imóveis..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Erro ao carregar imóveis"
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
    <div className="py-2">
        {properties.length === 0 ? (
          <EmptyState
            title="Nenhum imóvel no time"
            description="Quando o time cadastrar imóveis, eles aparecerão aqui."
            action={
              <Link
                href="/owner/new"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold"
              >
                Cadastrar imóvel
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {properties.map((p) => (
              <PropertyCardV2
                key={p.id}
                id={p.id}
                href={`/property/${p.id}`}
                title={p.title}
                price={p.price}
                status={p.status}
                image={p.image}
                street={p.street}
                neighborhood={p.neighborhood}
                city={p.city}
                state={p.state}
                bedrooms={p.bedrooms}
                bathrooms={p.bathrooms}
                areaM2={p.areaM2}
                type={p.type}
                views={p.views}
                leads={p.leads}
                favorites={p.favorites}
              />
            ))}
          </div>
        )}
    </div>
  );
}
