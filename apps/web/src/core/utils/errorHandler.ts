export const getErrorMessage = (
  error: unknown,
  fallbackMessage: string
): string => {
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  if (error && typeof error === "object") {
    const err = error as any;

    if (err.message && typeof err.message === "string") {
      return err.message;
    }

    if (err.detail && typeof err.detail === "string") {
      return err.detail;
    }

    if (err.response?.data?.message) {
      return err.response.data.message;
    }
  }

  return fallbackMessage;
};
