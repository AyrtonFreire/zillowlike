"use client";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { useState } from "react";

export default function SiteFooter() {
  const [email, setEmail] = useState("");
  return (
    <footer className="bg-neutral-900 text-neutral-300">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
          <div className="md:col-span-2">
            <h3 className="text-white font-display text-2xl font-bold mb-3">OggaHub</h3>
            <p className="text-sm mb-4">Seu hub imobiliário para comprar, alugar e anunciar.</p>
            <form onSubmit={(e)=>{e.preventDefault();alert('Newsletter subscribed!');setEmail('');}} className="flex gap-2">
              <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" placeholder="Seu e-mail" required className="flex-1 px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500" />
              <Button type="submit" size="sm">Assinar</Button>
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
