"use client";

import { useState, useEffect } from "react";
import { Clock, CheckCircle2 } from "lucide-react";

interface TimeSlotPickerProps {
  propertyId: string;
  selectedDate: Date;
  selectedTime: string | null;
  onTimeSelect: (time: string) => void;
}

export default function TimeSlotPicker({
  propertyId,
  selectedDate,
  selectedTime,
  onTimeSelect,
}: TimeSlotPickerProps) {
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [takenSlots, setTakenSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAvailableSlots();
  }, [propertyId, selectedDate]);

  const fetchAvailableSlots = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const response = await fetch(
        `/api/leads/available-slots?propertyId=${propertyId}&date=${dateStr}`
      );
      const data = await response.json();
      setAvailableSlots(data.available || []);
      setTakenSlots(data.taken || []);
    } catch (error) {
      console.error("Error fetching slots:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (availableSlots.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Nenhum horário disponível para esta data</p>
        <p className="text-sm mt-1">Tente outra data</p>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        ⏰ Escolha o horário
      </label>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {availableSlots.map((time) => (
          <button
            key={time}
            onClick={() => onTimeSelect(time)}
            className={`
              relative px-4 py-3 rounded-lg border-2 font-medium transition-all
              ${
                selectedTime === time
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-blue-300 text-gray-700 hover:bg-gray-50"
              }
            `}
          >
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{time}</span>
            </div>
            {selectedTime === time && (
              <div className="absolute -top-1 -right-1 bg-blue-600 rounded-full p-1">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      {takenSlots.length > 0 && (
        <div className="mt-4 text-xs text-gray-500">
          <p className="font-medium">Horários já ocupados:</p>
          <p className="mt-1">{takenSlots.join(", ")}</p>
        </div>
      )}
    </div>
  );
}
