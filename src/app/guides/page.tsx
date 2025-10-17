export default function GuidesIndexPage() {
  const guides = [
    { slug: "financiar-primeiro-imovel", title: "Como financiar seu primeiro imóvel" },
    { slug: "checklist-locacao", title: "Checklist para alugar sem dor de cabeça" },
    { slug: "avaliar-bairro", title: "Como avaliar um bairro" },
    { slug: "negociar-preco", title: "Dicas para negociar preço" },
  ];
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Guias</h1>
        <p className="text-gray-600">Tópicos práticos para ajudar na jornada de compra, venda ou aluguel.</p>
      </header>
      <nav aria-label="Guias disponíveis" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {guides.map(g => (
          <a key={g.slug} href={`/guides/${g.slug}`} className="block rounded-xl border border-gray-200 bg-white p-4 hover:shadow-lg transition-all">
            <h2 className="text-lg font-semibold text-gray-900">{g.title}</h2>
            <span className="text-sm text-blue-700 mt-1 inline-block">Ler guia →</span>
          </a>
        ))}
      </nav>
    </main>
  );
}
