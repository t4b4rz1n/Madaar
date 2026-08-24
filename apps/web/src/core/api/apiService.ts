import { type AxiosRequestConfig } from "axios";
import axiosClient from "../config/axiosClient";

export interface ApiResponseList<DataType> {
  current_page: number;
  has_next: boolean;
  has_previous: boolean;
  next_page: string | null;
  previous_page: string | null;
  result_count: number;
  total_pages: number;
  total_results: number;
  results: DataType[];
}

export interface ApiResponse<DataType> {
  message: string;
  data: DataType;
  status: boolean;
}

export interface RequestOptions {
  params?: Record<string, any>;
  data?: any;
  onUploadProgress?: AxiosRequestConfig["onUploadProgress"];
}

export class ApiService {
  /**
   * GET request with better type safety
   */
  static async get<T = any>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const response = await axiosClient.get<ApiResponse<T>>(endpoint, {
      params: options?.params,
    });
    return response.data;
  }

  /**
   * GET request for paginated lists
   */
  static async getList<T = any>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<ApiResponse<ApiResponseList<T>>> {
    const response = await axiosClient.get<ApiResponse<ApiResponseList<T>>>(
      endpoint,
      {
        params: options?.params,
      }
    );
    return response.data;
  }

  /**
   * POST request
   */
  static async post<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const response = await axiosClient.post<ApiResponse<T>>(endpoint, data, {
      params: options?.params,
      onUploadProgress: options?.onUploadProgress,
    });
    return response.data;
  }

  /**
   * PUT request
   */
  static async put<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const response = await axiosClient.put<ApiResponse<T>>(endpoint, data, {
      params: options?.params,
      onUploadProgress: options?.onUploadProgress,
    });
    return response.data;
  }

  /**
   * PATCH request
   */
  static async patch<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const response = await axiosClient.patch<ApiResponse<T>>(endpoint, data, {
      params: options?.params,
      onUploadProgress: options?.onUploadProgress,
    });
    return response.data;
  }

  /**
   * DELETE request
   */
  static async delete<T = any>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const response = await axiosClient.delete<ApiResponse<T>>(endpoint, {
      params: options?.params,
      data: options?.data,
    });
    if (response.status === 204 || !response.data) {
      return { message: "Deleted successfully", data: null as unknown as T, status: true };
    }
    return response.data;
  }
}

// Export both the new ApiService and the legacy DataProvider for backward compatibility
export default ApiService;
