import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { createUser, deleteUser, getUsers, updateUser } from "../api/usersApi";
import type { UserFormData, UserUpdateData } from "../types";

export const useUsers = (params: URLSearchParams) => {
  const serializedParams = params.toString();
  return useQuery({
    queryKey: ["users", serializedParams],
    queryFn: async () => {
      const response = await getUsers(params);
      return response.data;
    },
    placeholderData: keepPreviousData,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserFormData) => createUser(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created successfully");
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        "Failed to create user";
      toast.error(errorMessage);
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserUpdateData }) =>
      updateUser(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated successfully");
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        "Failed to update user";
      toast.error(errorMessage);
    },
  });
};

export const useDeleteUser = (orgId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => deleteUser(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["organizations"], exact: false });
      await queryClient.refetchQueries({ queryKey: ["users"], exact: false });
      await queryClient.refetchQueries({ queryKey: ["organizations"], exact: false });
      toast.success("User deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to delete user");
    },
  });
};
