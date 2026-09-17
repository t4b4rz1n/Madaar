import ApiService from "../../../core/api/apiService";
import type { Discount, DiscountFormData } from "../types";

export const getDiscounts = (params: URLSearchParams) => {
  return ApiService.getList<Discount>(`panel/discounts/?${params.toString()}`);
};

export const createDiscount = (data: DiscountFormData) =>
  ApiService.post<Discount>("panel/discounts/", data);

export const updateDiscount = (id: string, data: DiscountFormData) =>
  ApiService.put<Discount>(`panel/discounts/${id}/`, data);

export const deleteDiscount = (id: string) =>
  ApiService.delete(`panel/discounts/${id}/`);
