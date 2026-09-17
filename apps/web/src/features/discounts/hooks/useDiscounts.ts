import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "../../../core/utils/errorHandler";
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
    onSuccess: () => {
      toast.success("Discount created successfully");
      void queryClient.invalidateQueries({ queryKey: ["discounts"] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to create discount"));
    },
  });
};

export const useUpdateDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DiscountFormData }) =>
      updateDiscount(id, data),
    onSuccess: () => {
      toast.success("Discount updated successfully");
      void queryClient.invalidateQueries({ queryKey: ["discounts"] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to update discount"));
    },
  });
};

export const useDeleteDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDiscount(id),
    onSuccess: () => {
      toast.success("Discount deleted successfully");
      void queryClient.invalidateQueries({ queryKey: ["discounts"] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to delete discount"));
    },
  });
};
