"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { AccountSettingsSectionId } from "../settings-sections";

export function LegacySettingsRedirect({
  section,
  title,
  description,
}: {
  section: AccountSettingsSectionId;
  title: string;
  description: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", section);
    router.replace(`/account?${params.toString()}`);
  }, [router, searchParams, section]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-teal-700" />
        <h1 className="mt-6 text-2xl font-semibold text-neutral-950">{title}</h1>
        <p className="mt-2 text-sm text-neutral-600">{description}</p>
      </div>
    </main>
  );
}
