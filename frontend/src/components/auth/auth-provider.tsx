"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, type PublicUser } from "@/lib/auth-api";

const authKey = ["auth", "me"] as const;
type AuthContextValue = {
  user: PublicUser | null | undefined;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
  setUser: (user: PublicUser) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const current = useQuery({
    queryKey: authKey, queryFn: ({ signal }) => authApi.me(signal), retry: false,
  });
  async function clearPrivateData() {
    await client.cancelQueries();
    client.removeQueries({ predicate: query => query.queryKey[0] !== "auth" });
    client.getMutationCache().clear();
  }
  async function setUser(user: PublicUser) {
    await clearPrivateData();
    client.setQueryData(authKey, user);
  }
  async function logout() {
    await authApi.logout();
    await clearPrivateData();
    client.setQueryData(authKey, null);
  }
  return <AuthContext.Provider value={{
    user: current.data, isPending: current.isPending, isError: current.isError,
    retry: () => { void current.refetch(); }, setUser, logout,
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("AuthProvider is required");
  return auth;
}
