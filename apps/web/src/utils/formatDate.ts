import { formatDisplayDate } from "./date";
export const formatDate = (dateString: string) => { return formatDisplayDate(new Date(dateString), "MMM dd, yyyy"); };
