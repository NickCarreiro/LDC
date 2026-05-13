"use client";

import { type ReactNode } from "react";

import { DataProvider } from "../lib/dataStore";

export function Providers({ children }: { children: ReactNode }) {
  return <DataProvider>{children}</DataProvider>;
}
