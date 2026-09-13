import { formatDisplayDate } from "../utils/date";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft2,
  ArrowRight2,
  
  CloseCircle,
  TickCircle,
} from "iconsax-reactjs";
import { useEffect, useState } from "react";
import { DoranDatePicker } from "@doranjs/react";
import { useAuthStore } from "../features/auth/store/authStore";
import "@doranjs/react/styles.css";

interface CustomDatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  error?: boolean;
}

export const CustomDatePicker = ({
  value,
  onChange,
  placeholder = "Select Date",
  className = "",
  triggerClassName = "w-full p-3 bg-base-100 border rounded-xl flex items-center justify-between text-left hover:border-primary/50 transition-colors",
  error = false,
}: CustomDatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const preference = useAuthStore((state) => state.user?.calendar_preference) || "gregorian";

  useEffect(() => {
    if (value) {
      const parsed = parseISO(value);
      if (isValid(parsed)) {
        setSelectedDate(parsed);
        setCurrentMonth(parsed);
      }
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  if (preference === "jalali") {
    return (
      <div className={`relative w-full ${className}`}>
        <DoranDatePicker
          value={value || null}
          onChange={(_v, gregorian) => {
            if (gregorian) {
              onChange(format(gregorian, "yyyy-MM-dd"));
            } else {
              onChange("");
            }
          }}
          placeholder={placeholder}
          className={`${triggerClassName} ${error ? "border-error" : "border-base-content/20"}`}
          dir="rtl"
        />
      </div>
    );
  }

  // Fallback to existing Gregorian calendar implementation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onChange(format(date, "yyyy-MM-dd"));
    setIsOpen(false);
  };

  const handleClearDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(null);
    onChange("");
  };

  return (
    <>
      <div className={`relative ${className}`}>
        <motion.button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`${triggerClassName} ${error ? "border-error" : "border-base-content/20"}`}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center gap-2 flex-1 overflow-hidden">
            
            <span
              className={`text-sm truncate ${selectedDate
                  ? "font-medium text-base-content"
                  : "text-base-content/60"
                }`}
            >
              {selectedDate
                ? formatDisplayDate(selectedDate, "MMMM dd, yyyy")
                : placeholder}
            </span>
          </div>
          {selectedDate && (
            <div
              role="button"
              onClick={handleClearDate}
              className="text-base-content/40 hover:text-error transition-colors ml-2 p-1"
            >
              <CloseCircle size={16} />
            </div>
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-base-content/10 bg-base-100/50">
                <button
                  type="button"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="btn btn-sm btn-ghost btn-circle"
                >
                  <ArrowLeft2 size={18} />
                </button>
                <h4 className="font-bold text-lg text-base-content">
                  {format(currentMonth, "MMMM yyyy")}
                </h4>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="btn btn-sm btn-ghost btn-circle"
                >
                  <ArrowRight2 size={18} />
                </button>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="h-8 flex items-center justify-center text-xs font-bold text-base-content/40 uppercase"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day) => {
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isSelected =
                      selectedDate && isSameDay(day, selectedDate);
                    const isTodayDate = isToday(day);

                    return (
                      <motion.button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => handleDateClick(day)}
                        className={`
                          h-10 w-10 mx-auto rounded-xl text-sm font-medium transition-all relative flex items-center justify-center
                          ${!isCurrentMonth
                            ? "text-base-content/20"
                            : isSelected
                              ? "bg-primary text-primary-content shadow-lg shadow-primary/30"
                              : isTodayDate
                                ? "bg-primary/10 text-primary font-bold border-2 border-primary/20"
                                : "text-base-content hover:bg-base-200"
                          }
                        `}
                        whileTap={{ scale: 0.9 }}
                      >
                        {format(day, "d")}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 border-t border-base-content/10 bg-base-100 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => handleDateClick(new Date())}
                  className="text-primary text-sm font-medium hover:underline"
                >
                  Jump to Today
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="btn btn-sm btn-ghost rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="btn btn-sm btn-primary rounded-lg"
                  >
                    <TickCircle size={16} /> Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
