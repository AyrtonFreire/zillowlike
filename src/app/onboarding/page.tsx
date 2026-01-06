"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const isAdmin =
    (session as any)?.role === "ADMIN" ||
    ((session?.user as any)?.role ?? "") === "ADMIN";

  useEffect(() => {
    if (!session) return;

    if (isAdmin) {
      router.replace("/admin");
    } else {
      router.replace("/start");
    }
  }, [isAdmin, router, session]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <p className="text-sm text-gray-600 text-center">
        Redirecionando para o painel certo para você, aguarde um instante...
      </p>
    </div>
  );
}
