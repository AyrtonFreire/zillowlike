import Link from "next/link";
import { ModernNavbar } from "@/components/modern";
import MobileHeaderZillow from "@/components/modern/MobileHeaderZillow";
import SiteFooter from "@/components/Footer";
import { ArrowRightCircle, FileText } from "lucide-react";

export default function GuidesIndexPage() {
  const guides = [
    { slug: "financiar-primeiro-imovel", title: "Como financiar seu primeiro imóvel", description: "Etapas, documentos e comparações para financiar com segurança." },
    { slug: "checklist-locacao", title: "Checklist para alugar sem dor de cabeça", description: "Contrato, garantias, vistoria e o que conferir antes de assinar." },
    { slug: "avaliar-bairro", title: "Como avaliar um bairro", description: "Mobilidade, serviços, infraestrutura e como checar zoneamento." },
    { slug: "negociar-preco", title: "Dicas para negociar preço", description: "Estratégias práticas para propor e fechar um bom acordo." },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      <MobileHeaderZillow variant="solid" />
      <div className="hidden md:block">
        <ModernNavbar forceLight />
      </div>
      <div className="h-16 md:h-0" />

      <div className="bg-gradient-to-br from-teal-600 to-teal-800 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
          <div className="text-center">
            <FileText className="w-14 h-14 mx-auto mb-5" />
            <h1 className="text-3xl md:text-4xl font-bold">Guias</h1>
            <p className="mt-3 text-teal-100 max-w-2xl mx-auto">
              Tópicos práticos para ajudar na jornada de compra, venda ou aluguel.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 md:py-12">
        <nav aria-label="Guias disponíveis" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {guides.map((g) => (
            <Link
              key={g.slug}
              href={`/guides/${g.slug}`}
              prefetch={false}
              className="group block rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-xl transition-shadow"
            >
              <h2 className="text-lg font-semibold text-gray-900">{g.title}</h2>
              <p className="mt-2 text-sm text-gray-600">{g.description}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 group-hover:text-blue-800">
                Ler guia
                <ArrowRightCircle className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </nav>
      </div>

      <SiteFooter />
    </main>
  );
}
