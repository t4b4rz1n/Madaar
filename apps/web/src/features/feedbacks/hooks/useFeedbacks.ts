import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { getFeedbacks, deleteFeedback } from "../api/feedbacksApi";

export const useFeedbacks = (params: URLSearchParams) => {
  const queryKey = ["feedbacks", params.toString()];
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await getFeedbacks(params);
      return response.data;
    },
    placeholderData: keepPreviousData,
  });
};

export const useDeleteFeedback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteFeedback(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
      toast.success("Feedback deleted successfully");
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        "Failed to delete feedback";
      toast.error(errorMessage);
    },
  });
};
