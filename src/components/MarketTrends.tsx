"use client";

export default function MarketTrends() {
  const cards = [
    { kpi: "R$/m² (mediana)", value: "R$ 5.120", delta: "+1,8% mês" },
    { kpi: "Tempo no mercado", value: "23 dias", delta: "-2 dias" },
    { kpi: "Novos esta semana", value: "+38", delta: "Petrolina/Juazeiro" },
    { kpi: "Taxa de desconto", value: "3,2%", delta: "price drop" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Tendências de mercado</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.kpi} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-600">{c.kpi}</div>
            <div className="mt-1 text-xl font-bold text-gray-900">{c.value}</div>
            <div className="mt-1 text-xs text-gray-500">{c.delta}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
