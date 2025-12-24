import Badge from "@/components/ui/Badge";
import Tooltip from "@/components/ui/Tooltip";
import { Award, Clock, Home, Info, MessageSquare, Star } from "lucide-react";

type Props = {
  activeProperties: number;
  activeLeads: number;
  longestResponseTimeMinutes: number | null;
  avgRating: number;
  totalRatings: number;
  completedDeals: number;
};

function formatMinutesCompact(totalMinutes: number) {
  const minutes = Math.max(0, Math.round(totalMinutes || 0));
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest > 0 ? `${hours}h ${rest}min` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const hoursRest = hours % 24;
  return hoursRest > 0 ? `${days}d ${hoursRest}h` : `${days}d`;
}

export default function IndicadoresConfianca({
  activeProperties,
  activeLeads,
  longestResponseTimeMinutes,
  avgRating,
  totalRatings,
  completedDeals,
}: Props) {
  const ratingLabel = avgRating > 0 ? avgRating.toFixed(1) : "N/A";
  const longestLabel =
    typeof longestResponseTimeMinutes === "number" ? formatMinutesCompact(longestResponseTimeMinutes) : "—";

  const responseVariant =
    longestResponseTimeMinutes == null
      ? "muted"
      : longestResponseTimeMinutes <= 60
        ? "success"
        : longestResponseTimeMinutes <= 240
          ? "warning"
          : "danger";

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Indicadores de confiança</h2>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Home className="h-4 w-4" />
            <span>Imóveis ativos</span>
          </div>
          <div className="mt-0.5 text-xl font-semibold text-gray-900">{activeProperties}</div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MessageSquare className="h-4 w-4" />
            <span>Leads em atendimento</span>
            <Tooltip content="Leads reservados/aceitos ou em etapas de visita.">
              <span className="inline-flex">
                <Info className="h-3.5 w-3.5 text-gray-400" />
              </span>
            </Tooltip>
          </div>
          <div className="mt-0.5 text-xl font-semibold text-gray-900">{activeLeads}</div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="h-4 w-4" />
            <span>Maior tempo s/ resposta (30d)</span>
            <Tooltip content="Maior tempo entre o lead e a primeira resposta (ou até agora, se ainda não respondeu) nos últimos 30 dias.">
              <span className="inline-flex">
                <Info className="h-3.5 w-3.5 text-gray-400" />
              </span>
            </Tooltip>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xl font-semibold text-gray-900">{longestLabel}</span>
            <Badge variant={responseVariant as any}>{responseVariant === "success" ? "Bom" : responseVariant === "warning" ? "Ok" : responseVariant === "danger" ? "Atenção" : "—"}</Badge>
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

        <div className="col-span-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Star className="h-4 w-4 text-yellow-400" />
            <span>Avaliações</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-xl font-semibold text-gray-900">{ratingLabel}</span>
            <span className="text-xs text-gray-500">
              {totalRatings} avaliação{totalRatings === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
