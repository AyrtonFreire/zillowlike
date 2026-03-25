"use client";
import React from "react";

interface CenteredSpinnerProps {
  message?: string;
  className?: string;
  fullScreen?: boolean;
}

export default function CenteredSpinner({ message = "Carregando...", className = "", fullScreen = false }: CenteredSpinnerProps) {
  return (
    <div className={`${fullScreen ? "min-h-screen bg-gray-50" : "min-h-[240px]"} flex w-full items-center justify-center ${className}`.trim()}>
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-teal-600/20 border-t-teal-600" />
        </div>
        <p className="text-sm font-medium text-gray-600">{message}</p>
      </div>
    </div>
  );
}
