"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function FavoriteButton({ propertyId, size = 20 }: { propertyId: string; size?: number }) {
  const { data: session } = useSession();
  const user = (session as any)?.user || null;
  const router = useRouter();
  const [fav, setFav] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // Load current favorite state on mount/auth change
  useEffect(() => {
    let alive = true;
    async function load() {
      if (!user) { setFav(false); return; }
      try {
        const res = await fetch('/api/favorites', { cache: 'no-store' });
        if (!res.ok) return setFav(false);
        const data = await res.json();
        if (!alive) return;
        const ids: string[] = Array.isArray(data?.items) ? data.items : [];
        setFav(ids.includes(propertyId));
      } catch {
        if (alive) setFav(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [user, propertyId]);

  const onToggle = useCallback(async () => {
    if (!user) {
      router.push('/api/auth/signin?callbackUrl=' + encodeURIComponent(window.location.pathname));
      return;
    }
    if (loading) return;
    setLoading(true);
    const optimistic = !(fav ?? false);
    setFav(optimistic);
    try {
      const method = optimistic ? 'POST' : 'DELETE';
      const res = await fetch('/api/favorites', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      });
      if (!res.ok) {
        // rollback
        setFav(!optimistic);
      }
    } catch {
      setFav(!optimistic);
    } finally {
      setLoading(false);
    }
  }, [user, fav, loading, propertyId, router]);

  const aria = useMemo(() => fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos', [fav]);

  return (
    <button
      type="button"
      aria-label={aria}
      title={aria}
      onClick={onToggle}
      disabled={loading || fav === null}
      className={`p-2 rounded-full bg-white/90 hover:bg-white shadow ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      {fav ? (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-pink-600"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1.01 4.22 2.53h.56C12.09 5.01 13.76 4 15.5 4 18 4 20 6 20 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
      ) : (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-pink-600"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364 4.318 12.682z"/></svg>
      )}
    </button>
  );
}
