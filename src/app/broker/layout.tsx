import type { ReactNode } from "react";
import BrokerShell from "./BrokerShell";

export default function BrokerLayout({ children }: { children: ReactNode }) {
  return <BrokerShell>{children}</BrokerShell>;
}
