import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "../../features/auth/store/authStore";
import { API_TIMEOUT, getApiUrl } from "../api/config";
import { AUTH_STORAGE_KEY } from "./constants";

const axiosClient: AxiosInstance = axios.create({
  baseURL: getApiUrl(),
  timeout: API_TIMEOUT,
});

const getAuthToken = (): string | null => {
  try {
    const authDataString = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!authDataString) return null;

    const authData = JSON.parse(authDataString);
    // Zustand persist stores data inside a 'state' object
    const token = authData?.state?.access;

    if (token) {
      return `Bearer ${token}`;
    }
  } catch (e) {
    console.error("Error parsing auth data from localStorage", e);
  }
  return null;
};

// Request interceptor
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken();
    if (token) {
      config.headers.set("Authorization", token);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error?.response?.status === 401) {
      // Clear Zustand state on 401
      useAuthStore.getState().logout();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    if (error?.response?.data) {
      return Promise.reject(error.response.data);
    }

    if (error instanceof Error) {
      return Promise.reject({
        message: error.message,
        data: {},
        status: false,
      });
    }

    return Promise.reject({
      message: "An unknown error occurred",
      data: {},
      status: false,
    });
  }
);

export default axiosClient;
