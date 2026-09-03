import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRole,
  deleteRole,
  getPermissions,
  getRoles,
  updateRole,
} from "../api/rolesApi";
import type { ApiResponseList } from "../../../core/api/apiService";
import type { PermissionsResponse, Role, RoleFormData, RoleUpdateData } from "../types";
import type { GetRolesParams } from "../api/rolesApi";

const ROLES_QUERY_KEY = ["roles"] as const;
const PERMISSIONS_QUERY_KEY = ["roles", "permissions"] as const;

export const useRoles = (params?: GetRolesParams) => {
  return useQuery<ApiResponseList<Role>>({
    queryKey: params ? [...ROLES_QUERY_KEY, params] : ROLES_QUERY_KEY,
    queryFn: () => getRoles(params),
  });
};

/** Fetches all system permissions + default role→permissions mapping from the backend. */
export const usePermissions = () => {
  return useQuery<PermissionsResponse>({
    queryKey: PERMISSIONS_QUERY_KEY,
    queryFn: getPermissions,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes — permissions rarely change
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RoleFormData) => createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RoleUpdateData }) =>
      updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: PERMISSIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["current-user-profile"] });
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};
