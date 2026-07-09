import { format } from "date-fns";

export const formatDate = (dateString: string | undefined | null) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "MMM dd, yyyy");
  } catch {
    return dateString;
  }
};
