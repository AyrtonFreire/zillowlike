import type { ReactNode } from "react";
import AgencyShell from "./AgencyShell";

export default function AgencyLayout({ children }: { children: ReactNode }) {
  return <AgencyShell>{children}</AgencyShell>;
}
