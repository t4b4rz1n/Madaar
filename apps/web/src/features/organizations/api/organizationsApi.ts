import ApiService from "../../../core/api/apiService";
import type { Organization, OrganizationMember, OrganizationPayload } from "../types";
import type { User } from "../../users/types";

const unwrap = <T>(response: unknown): T => {
  const value = response as { data?: unknown } | null;
  return (value?.data ?? response) as T;
};

const extractList = <T>(response: unknown): T[] => {
  const root = unwrap<unknown>(response);
  if (Array.isArray(root)) return root as T[];
  if (root && typeof root === "object") {
    const results = (root as { results?: unknown }).results;
    return Array.isArray(results) ? (results as T[]) : [];
  }
  return [];
};

export const getOrganizations = async (): Promise<Organization[]> => {
  const response = await ApiService.get("/organizations/");
  return extractList<Organization>(response);
};

export const createOrganization = async (payload: OrganizationPayload): Promise<Organization> => {
  const response = await ApiService.post<Organization>("/organizations/", payload);
  return unwrap<Organization>(response);
};

export const updateOrganization = async (
  id: string,
  payload: Partial<OrganizationPayload>,
): Promise<Organization> => {
  const response = await ApiService.patch<Organization>(`/organizations/${id}/`, payload);
  return unwrap<Organization>(response);
};

export const deleteOrganization = async (id: string): Promise<void> => {
  await ApiService.delete(`/organizations/${id}/`);
};

export const getOrganizationDetails = async (orgId: string): Promise<Organization> => {
  const response = await ApiService.get<Organization>(`/organizations/${orgId}/`);
  return unwrap<Organization>(response);
};

export const getOrganizationMembers = async (orgId: string): Promise<OrganizationMember[]> => {
  const response = await ApiService.getList<User>(`panel/users/?organization_id=${orgId}`);
  return (response.data?.results ?? []).map((user) => ({
    id: user.id,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      profile_image: (user as any).avatar ?? (user as any).profile_image ?? null,
    },
  }));
};
