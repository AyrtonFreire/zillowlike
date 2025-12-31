import ReportUserButton from "@/components/ReportUserButton";
import {
  Award,
  Building2,
  CheckCircle,
  Clock,
  Facebook,
  Home as HomeIcon,
  Instagram,
  Linkedin,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  TrendingUp,
} from "lucide-react";

type Props = {
  realtorId: string;
  name: string;
  isAgency: boolean;
  image?: string | null;
  headline: string;
  locationLabel?: string;
  avgRating: number;
  totalRatings: number;
  avgResponseTime: number | null;
  publicPhoneOptIn: boolean;
  phone?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  facebook?: string | null;
  whatsapp?: string | null;
  participatesInLeadBoard: boolean;
  creci?: string | null;
  creciState?: string | null;
  isTopProducer: boolean;
  isFastResponder: boolean;
  totalActiveProperties: number;
};

export default function CorretorHeader({
  realtorId,
  name,
  isAgency,
  image,
  headline,
  locationLabel,
  avgRating,
  totalRatings,
  avgResponseTime,
  publicPhoneOptIn,
  phone,
  instagram,
  linkedin,
  facebook,
  whatsapp,
  participatesInLeadBoard,
  creci,
  creciState,
  isTopProducer,
  isFastResponder,
  totalActiveProperties,
}: Props) {
  const initial = (name || "?").charAt(0).toUpperCase();
  const creciVerified = Boolean(creci && creciState);

  return (
    <section className="mb-8">
      <div className="relative overflow-hidden rounded-3xl bg-brand-gradient text-white shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/10" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6 px-6 py-8 md:px-10 md:py-10">
          <div className="flex items-start gap-4 md:gap-6">
            <div className="relative flex-shrink-0">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt={name}
                  className="h-20 w-20 md:h-24 md:w-24 rounded-2xl border-2 border-white/40 object-cover shadow-md bg-white/10"
                />
              ) : (
                <div className="h-20 w-20 md:h-24 md:w-24 rounded-2xl bg-white/15 flex items-center justify-center text-3xl md:text-4xl font-semibold shadow-md">
                  {initial}
                </div>
              )}
            </div>

            <div className="space-y-2 md:space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{name}</h1>
                <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                  {isAgency ? (
                    <>
                      <Building2 className="mr-1.5 h-3.5 w-3.5" />
                      Imobiliária parceira
                    </>
                  ) : (
                    <>
                      <HomeIcon className="mr-1.5 h-3.5 w-3.5" />
                      Corretor parceiro
                    </>
                  )}
                </span>
                {creciVerified && (
                  <span className="inline-flex items-center rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-50 border border-green-300/50">
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                    CRECI {creci}/{creciState}
                  </span>
                )}
                {participatesInLeadBoard && (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-50 border border-emerald-300/50">
                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                    Mural de Leads
                  </span>
                )}
                {isTopProducer && (
                  <span className="inline-flex items-center rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-50 border border-amber-300/50">
                    <Award className="mr-1.5 h-3.5 w-3.5" />
                    Top Producer
                  </span>
                )}
                {isFastResponder && (
                  <span className="inline-flex items-center rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-50 border border-blue-300/50">
                    <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                    Resposta Rápida
                  </span>
                )}
              </div>

              <p className="max-w-xl text-sm md:text-base text-white/85">{headline}</p>

              <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-white/85">
                {locationLabel && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {locationLabel}
                  </span>
                )}
                {avgRating > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="h-4 w-4 text-yellow-300" />
                    {avgRating.toFixed(1)}
                    <span className="opacity-80">
                      ({totalRatings} avaliação{totalRatings === 1 ? "" : "s"})
                    </span>
                  </span>
                )}
                {avgResponseTime != null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {avgResponseTime} min tempo médio de resposta
                  </span>
                )}
                {publicPhoneOptIn && phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-4 w-4" />
                    <span className="truncate max-w-[160px]">{phone}</span>
                  </span>
                )}
              </div>

              {(instagram || linkedin || facebook || whatsapp) && (
                <div className="flex items-center gap-2 mt-3">
                  {instagram && (
                    <a
                      href={`https://instagram.com/${instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      aria-label="Instagram"
                    >
                      <Instagram className="h-4 w-4" />
                    </a>
                  )}
                  {linkedin && (
                    <a
                      href={linkedin.startsWith("http") ? linkedin : `https://linkedin.com/in/${linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      aria-label="LinkedIn"
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                  )}
                  {facebook && (
                    <a
                      href={facebook.startsWith("http") ? facebook : `https://facebook.com/${facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      aria-label="Facebook"
                    >
                      <Facebook className="h-4 w-4" />
                    </a>
                  )}
                  {whatsapp && (
                    <a
                      href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 hover:bg-green-500/30 transition-colors text-xs font-medium"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 mt-2">
                <ReportUserButton userId={realtorId} userDisplayName={name} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 text-sm">
            <div className="rounded-2xl bg-white/10 px-4 py-3 border border-white/15">
              <div className="flex items-center justify-between text-xs text-white/80">
                <span>Imóveis ativos</span>
                <HomeIcon className="h-4 w-4" />
              </div>
              <p className="mt-1 text-2xl font-semibold">{totalActiveProperties}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
