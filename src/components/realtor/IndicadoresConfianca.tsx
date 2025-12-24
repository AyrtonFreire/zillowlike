import Tooltip from "@/components/ui/Tooltip";
import { Award, CalendarDays, Info, Star } from "lucide-react";

type Props = {
  avgRating: number;
  totalRatings: number;
  completedDeals: number;
  activeSince: Date | string;
};

function formatActiveSince(value: Date | string) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export default function IndicadoresConfianca({
  avgRating,
  totalRatings,
  completedDeals,
  activeSince,
}: Props) {
  const ratingLabel = avgRating > 0 ? avgRating.toFixed(1) : "N/A";
  const activeSinceLabel = formatActiveSince(activeSince);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Indicadores de confiança</h2>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Star className="h-4 w-4 text-yellow-400" />
            <span>Avaliação média</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-xl font-semibold text-gray-900">{ratingLabel}</span>
            <span className="text-xs text-gray-500">
              {totalRatings} avaliação{totalRatings === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Award className="h-4 w-4" />
            <span>Negócios concluídos</span>
            <Tooltip content="Leads marcados como ganho (WON) no funil do profissional.">
              <span className="inline-flex">
                <Info className="h-3.5 w-3.5 text-gray-400" />
              </span>
            </Tooltip>
          </div>
          <div className="mt-0.5 text-xl font-semibold text-gray-900">{completedDeals}</div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <CalendarDays className="h-4 w-4" />
            <span>Ativo desde</span>
          </div>
          <div className="mt-0.5 text-xl font-semibold text-gray-900">{activeSinceLabel}</div>
        </div>
      </div>
    </section>
  );
}
