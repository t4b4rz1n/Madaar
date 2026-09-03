// apps/web/src/features/organizations/hooks/useOrganizations.ts

import { useQuery } from "@tanstack/react-query";
import { getOrganizations } from "../api/organizationsApi";
import type { Organization } from "../types";

/**
 * Fetches all organizations the current user has access to.
 * Superusers see all orgs; regular users see orgs they belong to.
 */
export const useOrganizations = () => {
  return useQuery<Organization[]>({
    queryKey: ["organizations"],
    queryFn: getOrganizations,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
