import { DoranDate } from "@doranjs/core";
import { format as dateFnsFormat } from "date-fns";
import { useAuthStore } from "../features/auth/store/authStore";

export const formatDisplayDate = (
  date: Date | string,
  formatStr: string = "yyyy-MM-dd"
): string => {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  const preference = useAuthStore.getState().user?.calendar_preference || "gregorian";

  if (preference === "jalali") {
    const doranDate = DoranDate.fromGregorian(d);
    if (formatStr === "MMMM dd, yyyy") {
      return doranDate.format("D MMMM YYYY");
    }
    if (formatStr === "EEEE, d MMMM yyyy") {
      return doranDate.format("dddd، D MMMM YYYY");
    }
    if (formatStr === "MMM d, yyyy") {
      return doranDate.format("D MMM YYYY");
    }
    if (formatStr === "yyyy-MM-dd") {
      return doranDate.format("YYYY-MM-DD");
    }
    return doranDate.format(formatStr.replace(/y/g, "Y").replace(/d/g, "D"));
  }

  return dateFnsFormat(d, formatStr);
};
