"use client";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { useState } from "react";
import Input from "@/components/ui/Input";
import BrandLogo from "@/components/BrandLogo";
import { ArrowUpRight, BookOpen, Mail } from "lucide-react";
import { EMAIL_INTEREST_LABELS, type EmailInterest } from "@/lib/communication-preferences";

const FOOTER_INTERESTS: EmailInterest[] = ["BUY", "RENT"];

const FOOTER_CHANNELS = [
  { label: "Contato", href: "/contato", Icon: Mail },
  { label: "Blog", href: "/blog", Icon: BookOpen },
] as const;

export default function SiteFooter() {
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState<EmailInterest[]>(["BUY"]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleInterest(interest: EmailInterest, checked: boolean) {
    setInterests((current) => {
      const next = checked ? [...current, interest] : current.filter((item) => item !== interest);
      return Array.from(new Set(next));
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!interests.length) {
      setError("Selecione pelo menos uma opção de aviso para continuar.");
      return;
    }

    try {
      setLoading(true);
      const wantsPropertyAlerts = interests.length > 0;
      const response = await fetch("/api/email-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          city: city || undefined,
          frequency: "WEEKLY",
          interests,
          subscribedToAlerts: wantsPropertyAlerts,
          subscribedToDigest: true,
          subscribedToGuides: true,
          subscribedToPriceDrops: wantsPropertyAlerts,
          source: "FOOTER",
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        setError(payload?.error || "Não foi possível salvar sua assinatura agora.");
        return;
      }

      setEmail("");
      setCity("");
      setInterests(["BUY"]);
      setMessage("Assinatura confirmada. Você já pode receber alertas e resumos do OggaHub.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <footer className="bg-neutral-900 text-neutral-300">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
          <div className="md:col-span-2">
            <BrandLogo tone="light" size={42} className="mb-4" wordmarkClassName="text-2xl font-semibold tracking-tight" />
            <p className="mb-4 max-w-md text-sm leading-relaxed text-neutral-400">Inscreva-se na newsletter para acompanhar novas oportunidades com mais objetividade.</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="rounded-3xl border border-neutral-800 bg-neutral-950/60 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-300">Newsletter</div>
                <h4 className="text-lg font-semibold text-white">Receba novidades por e-mail</h4>
              </div>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Seu melhor e-mail" required className="border-neutral-700 bg-neutral-800 text-white placeholder-neutral-500 hover:border-neutral-600" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input value={city} onChange={(event) => setCity(event.target.value)} type="text" placeholder="Cidade de interesse" className="border-neutral-700 bg-neutral-800 text-white placeholder-neutral-500 hover:border-neutral-600" />
                <div className="rounded-3xl border border-neutral-800 bg-neutral-950/60 p-4">
                  <div className="text-sm font-medium text-white mb-2">Interesse</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  {FOOTER_INTERESTS.map((interest) => (
                    <div key={interest} className="flex items-center gap-3 min-h-[44px] py-2 text-neutral-300">
                      <input
                        type="checkbox"
                        checked={interests.includes(interest)}
                        onChange={(event) => toggleInterest(interest, event.target.checked)}
                        aria-label={EMAIL_INTEREST_LABELS[interest]}
                        className="h-5 w-5 shrink-0 rounded border-neutral-300 text-accent focus:ring-2 focus:ring-accent cursor-pointer"
                      />
                      <span className="text-sm leading-relaxed text-neutral-300">{EMAIL_INTEREST_LABELS[interest]}</span>
                    </div>
                  ))}
                </div>
              </div>
              </div>
              {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}
              {message && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</div>}
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <Button type="submit" size="sm" disabled={loading}>{loading ? "Enviando..." : "Quero receber"}</Button>
              </div>
              <p className="text-xs text-neutral-500">Envio semanal por padrão.</p>
            </form>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 font-display">Comprar</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/explore/buy?type=HOUSE" className="hover:text-white transition">Casas</Link></li>
              <li><Link href="/explore/buy?type=APARTMENT" className="hover:text-white transition">Apartamentos</Link></li>
              <li><Link href="/explore/buy?type=CONDO" className="hover:text-white transition">Condomínios</Link></li>
              <li><Link href="/explore/buy?type=LAND" className="hover:text-white transition">Terrenos</Link></li>
              <li><Link href="/explore/buy?type=RURAL" className="hover:text-white transition">Imóvel rural</Link></li>
              <li><Link href="/explore/buy?type=COMMERCIAL" className="hover:text-white transition">Comercial</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 font-display">Alugar</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/explore/rent?type=HOUSE" className="hover:text-white transition">Casas para alugar</Link></li>
              <li><Link href="/explore/rent?type=APARTMENT" className="hover:text-white transition">Apartamentos</Link></li>
              <li><Link href="/explore/rent?type=CONDO" className="hover:text-white transition">Condomínios</Link></li>
              <li><Link href="/explore/rent?type=LAND" className="hover:text-white transition">Terrenos</Link></li>
              <li><Link href="/explore/rent?type=RURAL" className="hover:text-white transition">Imóvel rural</Link></li>
              <li><Link href="/explore/rent?type=COMMERCIAL" className="hover:text-white transition">Comercial</Link></li>
              <li><Link href="/calculadora-aluguel" prefetch={false} className="hover:text-white transition">Calculadora</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 font-display">Empresa</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/sobre" prefetch={false} className="hover:text-white transition">Sobre</Link></li>
              <li><Link href="/contato" prefetch={false} className="hover:text-white transition">Contato</Link></li>
              <li><Link href="/blog" prefetch={false} className="hover:text-white transition">Blog</Link></li>
              <li><Link href="/privacidade" prefetch={false} className="hover:text-white transition">Privacidade</Link></li>
              <li><Link href="/termos" prefetch={false} className="hover:text-white transition">Termos</Link></li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-t border-neutral-800 pt-8 md:flex-row">
          <p className="text-sm">© {new Date().getFullYear()} OggaHub. Todos os direitos reservados.</p>
          <div className="flex flex-wrap items-center justify-center gap-3 md:justify-end">
            {FOOTER_CHANNELS.map(({ label, href, Icon }) => (
              <Link
                key={label}
                href={href}
                prefetch={false}
                className="group inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-950/60 px-3.5 py-2 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:text-white"
              >
                <Icon className="h-4 w-4 text-neutral-400 transition group-hover:text-teal-300" />
                <span>{label}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-neutral-500 transition group-hover:text-neutral-200" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
