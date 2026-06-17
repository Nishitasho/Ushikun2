"use client";

import type { ReactNode } from "react";
import { KurokoProvider } from "@/features/core/kuroko-store";

export function Providers({ children }: { children: ReactNode }) {
  return <KurokoProvider>{children}</KurokoProvider>;
}
