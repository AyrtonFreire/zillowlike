type Props = {
  bio?: string | null;
  specialties?: string[] | null;
  city?: string | null;
  state?: string | null;
  headline?: string | null;
  title?: string;
};

export default function SobreCorretor({ bio, specialties, city, state, headline, title = "Sobre o profissional" }: Props) {
  const specialtyLabel = Array.isArray(specialties) && specialties.length > 0
    ? specialties.join(", ")
    : "Atendimento imobiliário";

  const regionLabel = city && state ? `${city} / ${state}` : city || state || null;
  const serviceStyleLabel = headline ? String(headline) : "Digital e rápido";

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
      {bio ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="text-gray-700">
              <span className="font-medium text-gray-900">Especialidade:</span> {specialtyLabel}
            </div>
            {regionLabel && (
              <div className="text-gray-700">
                <span className="font-medium text-gray-900">Região:</span> {regionLabel}
              </div>
            )}
            <div className="text-gray-700">
              <span className="font-medium text-gray-900">Atendimento:</span> {serviceStyleLabel}
            </div>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{bio}</p>
        </div>
      ) : (
        <p className="text-sm text-gray-600">
          Este profissional ainda não preencheu uma bio pública. Mesmo assim, você pode conhecer o trabalho dele pelos
          imóveis anunciados e pelo desempenho no programa da plataforma.
        </p>
      )}
    </section>
  );
}
