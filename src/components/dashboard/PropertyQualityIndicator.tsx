"use client";

import { CheckCircle, XCircle, AlertCircle, Image as ImageIcon } from "lucide-react";

interface QualityCheck {
  label: string;
  passed: boolean;
  importance: "critical" | "important" | "nice";
}

interface PropertyQualityIndicatorProps {
  checks: QualityCheck[];
  score: number; // 0-100
}

export default function PropertyQualityIndicator({ checks, score }: PropertyQualityIndicatorProps) {
  const getScoreColor = () => {
    if (score >= 80) return { bg: "bg-green-500", text: "text-green-700", ring: "ring-green-200" };
    if (score >= 60) return { bg: "bg-yellow-500", text: "text-yellow-700", ring: "ring-yellow-200" };
    return { bg: "bg-red-500", text: "text-red-700", ring: "ring-red-200" };
  };

  const colors = getScoreColor();
  const passedChecks = checks.filter(c => c.passed).length;
  const totalChecks = checks.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Qualidade do anúncio</h3>
      
      {/* Score Circle */}
      <div className="flex items-center gap-6 mb-6">
        <div className="relative">
          <svg className="w-24 h-24 transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-200"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`}
              className={colors.bg.replace('bg-', 'text-')}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-bold ${colors.text}`}>{score}%</span>
          </div>
        </div>

        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-2">
            Seu anúncio está <span className="font-semibold">{passedChecks} de {totalChecks}</span> itens completos
          </p>
          {score < 80 && (
            <p className="text-xs text-gray-500">
              Anúncios mais completos têm {" "}
              <span className="font-semibold text-teal-600">até 3x mais visualizações</span> {" "}
              e geram mais leads qualificados.
            </p>
          )}
          {score >= 80 && (
            <p className="text-xs text-green-600 font-medium">
              ✨ Parabéns! Seu anúncio está otimizado
            </p>
          )}
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-3">
        {checks.map((check, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 p-3 rounded-lg ${
              check.passed ? "bg-green-50" : "bg-gray-50"
            }`}
          >
            {check.passed ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : check.importance === "critical" ? (
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-medium ${check.passed ? "text-green-700" : "text-gray-700"}`}>
                {check.label}
              </p>
              {!check.passed && check.importance === "critical" && (
                <p className="text-xs text-red-600 mt-0.5">
                  Essencial para boa performance
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
