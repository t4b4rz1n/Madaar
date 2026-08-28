import ApiService from "../../../core/api/apiService";
import type { Organization, OrganizationMember, OrganizationPayload } from "../types";
import type { AddExistingMemberPayload } from "../types";

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

/** Fetch members for a given organization */
export const getMembers = async (orgId: string): Promise<OrganizationMember[]> => {
  const response = await ApiService.get<OrganizationMember[]>(
    `/organizations/${orgId}/members/`,
  );
  const data = response.data;
  return Array.isArray(data) ? data : [];
};

/** Add an existing user to the organization */
export const addExistingMember = async (
  orgId: string,
  data: AddExistingMemberPayload,
): Promise<OrganizationMember> => {
  const response = await ApiService.post<OrganizationMember>(
    `/organizations/${orgId}/members/`,
    data,
  );
  return unwrap<OrganizationMember>(response);
};

/** Remove a member from the organization */
export const removeMember = async (orgId: string, userId: string): Promise<void> => {
  await ApiService.delete(`/organizations/${orgId}/members/${userId}/`);
};
