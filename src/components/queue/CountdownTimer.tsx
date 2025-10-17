"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  targetDate: Date;
  onExpire?: () => void;
}

export default function CountdownTimer({ targetDate, onExpire }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft("Expirado");
        if (onExpire) onExpire();
        return;
      }

      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onExpire]);

  if (isExpired) {
    return (
      <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
        <Clock className="w-4 h-4" />
        <span>Expirado</span>
      </div>
    );
  }

  const isUrgent = timeLeft.startsWith("0:") || timeLeft.startsWith("1:") || timeLeft.startsWith("2:");

  return (
    <div className={`flex items-center gap-2 text-sm font-medium ${isUrgent ? "text-orange-600" : "text-gray-600"}`}>
      <Clock className="w-4 h-4" />
      <span>{timeLeft}</span>
    </div>
  );
}
