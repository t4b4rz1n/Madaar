export const getErrorMessage = (
  error: unknown,
  fallbackMessage: string
): string => {
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;

    if (typeof err.message === "string") {
      return err.message;
    }

    if (typeof err.detail === "string") {
      return err.detail;
    }

    if (err.errors && typeof err.errors === "object") {
      for (const [field, value] of Object.entries(err.errors)) {
        if (Array.isArray(value) && value.length > 0) {
          return `${field}: ${String(value[0])}`;
        }

        if (typeof value === "string") {
          return `${field}: ${value}`;
        }
      }
    }

    const response = err.response as
      | { data?: { message?: unknown; detail?: unknown; errors?: unknown } }
      | undefined;

    if (typeof response?.data?.message === "string") {
      return response.data.message;
    }

    if (typeof response?.data?.detail === "string") {
      return response.data.detail;
    }

    if (response?.data?.errors && typeof response.data.errors === "object") {
      for (const [field, value] of Object.entries(response.data.errors)) {
        if (Array.isArray(value) && value.length > 0) {
          return `${field}: ${String(value[0])}`;
        }
        if (typeof value === "string") {
          return `${field}: ${value}`;
        }
      }
    }
  }

  return fallbackMessage;
};
