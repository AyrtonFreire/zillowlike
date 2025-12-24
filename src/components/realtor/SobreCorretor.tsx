type Props = {
  bio?: string | null;
  title?: string;
};

export default function SobreCorretor({ bio, title = "Sobre o profissional" }: Props) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
      {bio ? (
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{bio}</p>
      ) : (
        <p className="text-sm text-gray-600">
          Este profissional ainda não preencheu uma bio pública. Mesmo assim, você pode conhecer o trabalho dele pelos
          imóveis anunciados e pelo desempenho no programa da plataforma.
        </p>
      )}
    </section>
  );
}
