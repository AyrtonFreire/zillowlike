"use client";
import React from "react";

interface CenteredSpinnerProps {
  message?: string;
}

export default function CenteredSpinner({ message = "Carregando..." }: CenteredSpinnerProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}
