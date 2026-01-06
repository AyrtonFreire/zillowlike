"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OwnerLeadsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/owner/leads/pending");
  }, [router]);

  return null;
}
