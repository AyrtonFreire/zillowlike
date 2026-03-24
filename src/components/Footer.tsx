"use client";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";

export default function SiteFooter() {
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [interest, setInterest] = useState("BUY");
  const [frequency, setFrequency] = useState("WEEKLY");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!consent) {
      setError("Você precisa autorizar o envio para concluir a assinatura.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/email-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          city: city || undefined,
          frequency,
          interests: [interest],
          subscribedToAlerts: interest === "BUY" || interest === "RENT" || interest === "INVEST",
          subscribedToDigest: true,
          subscribedToGuides: true,
          subscribedToPriceDrops: interest === "BUY" || interest === "RENT" || interest === "INVEST",
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
      setInterest("BUY");
      setFrequency("WEEKLY");
      setConsent(false);
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
            <h3 className="text-white font-display text-2xl font-bold mb-3">OggaHub</h3>
            <p className="text-sm text-neutral-400 mb-4">Seu hub imobiliário para comprar, alugar e anunciar.</p>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5 mb-4">
              <h4 className="text-white font-semibold text-lg mb-2">Receba só o que faz sentido para você</h4>
              <div className="space-y-2 text-sm text-neutral-400">
                <p>Alertas de novos imóveis para quem está buscando agora.</p>
                <p>Resumos inteligentes para acompanhar o mercado sem ruído.</p>
                <p>Conteúdos práticos para comprar, alugar ou anunciar melhor.</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Seu melhor e-mail" required className="bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input value={city} onChange={(event) => setCity(event.target.value)} type="text" placeholder="Cidade de interesse" className="bg-neutral-800 border-neutral-700 text-white placeholder-neutral-500" />
                <Select value={interest} onChange={(event) => setInterest(event.target.value)} className="bg-neutral-800 border-neutral-700 text-white">
                  <option value="BUY">Quero comprar</option>
                  <option value="RENT">Quero alugar</option>
                  <option value="ANNOUNCE">Quero anunciar</option>
                  <option value="INVEST">Quero investir</option>
                </Select>
              </div>
              <Select value={frequency} onChange={(event) => setFrequency(event.target.value)} className="bg-neutral-800 border-neutral-700 text-white">
                <option value="INSTANT">Alertas imediatos</option>
                <option value="DAILY">Resumo diário</option>
                <option value="WEEKLY">Resumo semanal</option>
              </Select>
              <Checkbox checked={consent} onChange={(event) => setConsent(event.target.checked)} label="Autorizo o OggaHub a enviar alertas, resumos e conteúdos por e-mail. Posso sair quando quiser." className="text-neutral-300 [&_span]:text-neutral-300" />
              {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}
              {message && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</div>}
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <Button type="submit" size="sm" disabled={loading}>{loading ? "Enviando..." : "Quero receber"}</Button>
                <Link href="/account/communication" className="text-sm text-teal-300 hover:text-teal-200 transition">Gerenciar preferências</Link>
              </div>
              <p className="text-xs text-neutral-500">Sem spam. Com política de privacidade e cancelamento a qualquer momento.</p>
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
        <div className="border-t border-neutral-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm">© {new Date().getFullYear()} OggaHub. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <a href="https://facebook.com" target="_blank" rel="noopener" className="hover:text-white transition" aria-label="Facebook">FB</a>
            <a href="https://instagram.com" target="_blank" rel="noopener" className="hover:text-white transition" aria-label="Instagram">IG</a>
            <a href="https://twitter.com" target="_blank" rel="noopener" className="hover:text-white transition" aria-label="Twitter">TW</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
