export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
export const API_VERSION = import.meta.env.VITE_API_VERSION || "v1";
export const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;

export const getApiUrl = () =>
  `${API_BASE_URL.replace(/\/+$/, "")}/${API_VERSION.replace(/^\/+|\/+$/g, "")}`;
