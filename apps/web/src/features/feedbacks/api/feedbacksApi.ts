import ApiService from "../../../core/api/apiService";
import type { Feedback } from "../types";

export const getFeedbacks = (params: URLSearchParams) => {
  return ApiService.getList<Feedback>(`panel/feedbacks?${params.toString()}`);
};

export const deleteFeedback = (id: string) =>
  ApiService.delete(`panel/feedbacks/${id}/`);
