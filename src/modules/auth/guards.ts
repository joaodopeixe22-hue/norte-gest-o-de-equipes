import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { meQuery } from "./useMe";

/**
 * Bloqueio de navegação por papel. É só conforto de interface: quem decide de verdade
 * são as regras do banco (RLS/RPC) e as server functions.
 */
export async function requireRole(queryClient: QueryClient, kind: "manager" | "admin") {
  const me = await queryClient.ensureQueryData(meQuery);
  const ok = !!me && (kind === "admin" ? me.isAdmin : me.isManager);
  if (!ok) throw redirect({ to: "/inicio" });
}
