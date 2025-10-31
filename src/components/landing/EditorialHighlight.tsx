import Link from "next/link";
import Button from "@/components/ui/Button";

export default function EditorialHighlight() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="relative h-96 rounded-2xl overflow-hidden">
          <img src="/placeholder-editorial.jpg" alt="Weekly Highlight" className="w-full h-full object-cover" onError={(e) => { (e.target as any).src = 'data:image/svg+xml,%3Csvg width="800" height="600" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="800" height="600" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="24"%3EEditorial%3C/text%3E%3C/svg%3E'; }} />
        </div>
        <div className="space-y-4">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">Weekly Highlight</span>
          <h2 className="text-4xl font-display font-bold text-gray-900">Mansão à beira-mar em Florianópolis</h2>
          <p className="text-lg text-gray-600 leading-relaxed">Uma propriedade icônica com vistas deslumbrantes do oceano, arquitetura premiada e acabamentos de luxo. Explore esta residência excepcional no coração da Praia Mole.</p>
          <Link href="/?city=Florianópolis&state=SC&sort=price_desc"><Button>Ver imóveis em Florianópolis</Button></Link>
        </div>
      </div>
    </div>
  );
}
