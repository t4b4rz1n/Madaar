import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "../../features/auth/store/authStore";

const axiosClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor: reads access token directly from Zustand memory state
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().access;
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: handles 401 with Silent Token Refresh
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error?.config as (InternalAxiosRequestConfig & {
      _retry?: boolean;
    }) | undefined;

    if (error?.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const isRefreshEndpoint = originalRequest.url?.includes("/auth/login/refresh/");

      if (!isRefreshEndpoint) {
        const refreshToken = useAuthStore.getState().refresh;

        if (refreshToken) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((newToken) => {
                originalRequest.headers.set("Authorization", `Bearer ${newToken}`);
                return axiosClient(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const refreshUrl = `${getApiUrl()}/auth/login/refresh/`;
            const res = await axios.post(refreshUrl, { refresh: refreshToken });

            // ApiRenderer envelope format wraps data inside res.data.data
            const responseData = res.data?.data || res.data;
            const newAccess = responseData?.access;
            const newRefresh = responseData?.refresh || refreshToken;

            if (newAccess) {
              useAuthStore.getState().setTokens({
                access: newAccess,
                refresh: newRefresh,
              });

              processQueue(null, newAccess);
              originalRequest.headers.set("Authorization", `Bearer ${newAccess}`);
              return axiosClient(originalRequest);
            }
          } catch (refreshErr) {
            processQueue(refreshErr, null);
            useAuthStore.getState().logout();
            if (window.location.pathname !== "/login") {
              window.location.href = "/login";
            }
            return Promise.reject(refreshErr);
          } finally {
            isRefreshing = false;
          }
        }
      }

      // If no refresh token or refresh endpoint itself failed
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
