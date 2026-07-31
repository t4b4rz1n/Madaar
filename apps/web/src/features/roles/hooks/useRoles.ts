import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRole, deleteRole, getRoles, updateRole } from "../api/rolesApi";
import type { ApiResponseList } from "../../../core/api/apiService";
import type { Role, RoleFormData, RoleUpdateData } from "../types";

const ROLES_QUERY_KEY = ["roles"] as const;

export const useRoles = () => {
  return useQuery<ApiResponseList<Role>>({
    queryKey: ROLES_QUERY_KEY,
    queryFn: () => getRoles(),
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RoleFormData) => createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
    },
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RoleUpdateData }) =>
      updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
    },
  });
};
