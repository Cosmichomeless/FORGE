"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { organizationsApi, type Organization } from "@/lib/organizations-api";
import { useAuth } from "@/components/auth/auth-provider";

export const organizationsKey = ["organizations"] as const;
type OrganizationContextValue = {
  organizations: Organization[];
  active: Organization | null;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
  setActiveId: (id: string) => void;
};
const OrganizationContext = createContext<OrganizationContextValue | null>(null);
const storageKey = (userId: string) => `forge.activeOrganization.${userId}`;

// localStorage is only a per-browser convenience; it may be blocked or empty.
function readStored(userId: string | undefined): string | null {
  if (!userId) return null;
  try { return window.localStorage.getItem(storageKey(userId)); } catch { return null; }
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [choice, setChoice] = useState<{ userId: string; id: string } | null>(null);
  const query = useQuery({
    queryKey: organizationsKey, queryFn: ({ signal }) => organizationsApi.list(signal), enabled: !!userId, retry: false,
  });
  const organizations = useMemo(() => (userId ? query.data ?? [] : []), [userId, query.data]);
  const preferred = choice && choice.userId === userId ? choice.id : readStored(userId);
  const active = organizations.find(o => o.id === preferred) ?? organizations[0] ?? null;
  const setActiveId = useCallback((id: string) => {
    if (!userId) return;
    setChoice(previous => previous?.userId === userId && previous.id === id ? previous : { userId, id });
    try { window.localStorage.setItem(storageKey(userId), id); } catch { /* storage unavailable */ }
  }, [userId]);
  return <OrganizationContext.Provider value={{
    organizations, active, isPending: !!userId && query.isPending, isError: !!userId && query.isError,
    retry: () => { void query.refetch(); }, setActiveId,
  }}>{children}</OrganizationContext.Provider>;
}

export function useOrganizations() {
  const value = useContext(OrganizationContext);
  if (!value) throw new Error("OrganizationProvider is required");
  return value;
}
