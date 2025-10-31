export default function Trustbar() {
  const partners = ['Sotheby\'s', 'Christie\'s', 'Knight Frank', 'Engel & Völkers', 'Coldwell Banker'];
  return (
    <div className="bg-neutral-50 py-8 border-y">
      <div className="mx-auto max-w-7xl px-4">
        <p className="text-center text-sm text-neutral-600 mb-4 font-medium">Em parceria com as principais imobiliárias de luxo do mundo</p>
        <div className="flex items-center justify-center gap-8 flex-wrap">
          {partners.map(p => (
            <div key={p} className="text-lg font-display text-neutral-700 opacity-60 hover:opacity-100 transition-opacity">{p}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
