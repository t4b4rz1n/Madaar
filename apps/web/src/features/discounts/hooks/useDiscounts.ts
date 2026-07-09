import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createDiscount,
  getDiscounts,
  updateDiscount,
  deleteDiscount,
} from "../api/discountsApi";
import type { DiscountFormData } from "../types";

export const useDiscounts = (params: URLSearchParams) => {
  const queryKey = ["discounts", params.toString()];
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await getDiscounts(params);
      return response.data;
    },
    placeholderData: keepPreviousData,
  });
};

export const useCreateDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DiscountFormData) => createDiscount(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast.success("Discount created successfully");
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        "Failed to create discount";
      toast.error(errorMessage);
    },
  });
};

export const useUpdateDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DiscountFormData }) =>
      updateDiscount(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast.success("Discount updated successfully");
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        "Failed to update discount";
      toast.error(errorMessage);
    },
  });
};

export const useDeleteDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDiscount(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast.success("Discount deleted successfully");
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        "Failed to delete discount";
      toast.error(errorMessage);
    },
  });
};
