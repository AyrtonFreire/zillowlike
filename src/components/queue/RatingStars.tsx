"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface RatingStarsProps {
  rating?: number;
  onRate?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function RatingStars({
  rating = 0,
  onRate,
  readonly = false,
  size = "md",
  showLabel = false,
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const handleClick = (value: number) => {
    if (!readonly && onRate) {
      onRate(value);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => handleClick(value)}
            onMouseEnter={() => !readonly && setHoverRating(value)}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            disabled={readonly}
            className={`${
              readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
            } transition-transform`}
          >
            <Star
              className={`${sizeClasses[size]} ${
                value <= displayRating
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-gray-200 text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
      {showLabel && rating > 0 && (
        <span className="text-sm font-medium text-gray-700">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
