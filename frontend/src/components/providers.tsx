"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { OrganizationProvider } from "@/components/organizations/organization-provider";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return <QueryClientProvider client={queryClient}><AuthProvider><OrganizationProvider>{children}</OrganizationProvider></AuthProvider></QueryClientProvider>;
}
