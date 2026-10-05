export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
export const API_VERSION = import.meta.env.VITE_API_VERSION || "v1";
export const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;

export const resolveApiUrl = (base = API_BASE_URL, version = API_VERSION) => {
  const normalizedBase = base.replace(/\/+$/, "");
  const normalizedVersion = version.replace(/^\/+|\/+$/g, "");
  // Deployments may supply either /api or the already versioned /api/v1.
  return !normalizedVersion || normalizedBase.endsWith(`/${normalizedVersion}`)
    ? normalizedBase
    : `${normalizedBase}/${normalizedVersion}`;
};

export const getApiUrl = () => resolveApiUrl();
