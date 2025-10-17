import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ScoreBadgeProps {
  score: number;
  change?: number;
  size?: "sm" | "md" | "lg";
}

export default function ScoreBadge({ score, change, size = "md" }: ScoreBadgeProps) {
  const sizeClasses = {
    sm: "text-sm px-2 py-1",
    md: "text-base px-3 py-1.5",
    lg: "text-lg px-4 py-2",
  };

  const iconSize = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const getScoreColor = (score: number) => {
    if (score >= 100) return "bg-purple-100 text-purple-700 border-purple-200";
    if (score >= 50) return "bg-blue-100 text-blue-700 border-blue-200";
    if (score >= 20) return "bg-green-100 text-green-700 border-green-200";
    if (score >= 0) return "bg-gray-100 text-gray-700 border-gray-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  const renderChangeIcon = () => {
    if (!change) return null;
    
    if (change > 0) {
      return <TrendingUp className={`${iconSize[size]} text-green-600`} />;
    } else if (change < 0) {
      return <TrendingDown className={`${iconSize[size]} text-red-600`} />;
    }
    return <Minus className={`${iconSize[size]} text-gray-400`} />;
  };

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border font-semibold ${sizeClasses[size]} ${getScoreColor(score)}`}>
      <span>{score} pts</span>
      {change !== undefined && (
        <>
          {renderChangeIcon()}
          <span className={`text-xs ${change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-gray-400"}`}>
            {change > 0 ? "+" : ""}{change}
          </span>
        </>
      )}
    </div>
  );
}
