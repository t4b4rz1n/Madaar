/**
 * Extracts the first field-level error message from a DRF validation error object.
 * Returns only the error text (not the field name) for a cleaner UX.
 */
const extractFieldError = (data: Record<string, unknown>): string | null => {
  for (const [, value] of Object.entries(data)) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
      return value[0];
    }
    if (typeof value === "string") {
      return value;
    }
  }
  return null;
};

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
      const msg = extractFieldError(err.errors as Record<string, unknown>);
      if (msg) return msg;
    }

    const response = err.response as
      | { data?: Record<string, unknown> }
      | undefined;

    if (response?.data && typeof response.data === "object") {
      const data = response.data;

      if (typeof data.message === "string") return data.message;
      if (typeof data.detail === "string") return data.detail;

      if (data.errors && typeof data.errors === "object") {
        const msg = extractFieldError(data.errors as Record<string, unknown>);
        if (msg) return msg;
      }

      // DRF sometimes returns validation errors directly as { field: ["error msg"] }
      // (no "errors" wrapper) — handle that case too
      const directMsg = extractFieldError(data);
      if (directMsg) return directMsg;
    }
  }

  return fallbackMessage;
};
