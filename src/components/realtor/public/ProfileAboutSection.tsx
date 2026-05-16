import ProfileFactSheet, { type FactSheetVM } from "./ProfileFactSheet";

export default function ProfileAboutSection({
  name,
  bio,
  factSheet,
}: {
  name: string;
  bio: string | null;
  factSheet: FactSheetVM | null;
}) {
  const firstName = name.split(" ")[0] || name;
  const narrative =
    bio ||
    `${name} publica imóveis selecionados no OggaHub. Entre em contato pelo WhatsApp para receber uma busca personalizada.`;

  const hasSheet =
    factSheet &&
    (factSheet.items.some((item) => item.value) ||
      factSheet.specialties.length > 0 ||
      factSheet.serviceAreas.length > 0);

  return (
    <section
      id="about"
      className="scroll-mt-28 border-b border-slate-200 pb-12 pt-2"
    >
      <div
        className={`grid gap-8 ${
          hasSheet ? "lg:grid-cols-[minmax(0,1fr)_320px]" : ""
        }`}
      >
        <div className="max-w-3xl">
          <h2 className="font-serif text-2xl text-slate-950 sm:text-3xl">
            Sobre {firstName}
          </h2>
          <div className="mt-5 whitespace-pre-line text-[15px] leading-8 text-slate-700">
            {narrative}
          </div>
        </div>

        {hasSheet ? <ProfileFactSheet factSheet={factSheet} /> : null}
      </div>
    </section>
  );
}
