import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight2, Notification as NotificationIcon } from "iconsax-reactjs";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  useMarkAllNotificationsSeen,
  useNotificationHistory,
  useUnreadNotifications,
} from "../notifications/hooks/useNotifications";
import type { Notification } from "../notifications/types";
import { motionTokens } from "../../core/config/designTokens";

const formatNotificationDate = (date: string) => {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
};

export const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use unread-only query for the badge count — works for all users, no permission gate
  const { data: unreadData } = useUnreadNotifications();
  const unreadCount = unreadData?.total_results ?? (unreadData?.results?.length ?? 0);

  // Fetch last 6 notifications for the dropdown preview
  const params = useRef(
    new URLSearchParams({ page: "1", page_size: "6", ordering: "-created_at" }),
  ).current;
  const { data, isLoading, isError } = useNotificationHistory(params, {
    enabled: isOpen,
  });

  const { mutate: markAllSeen } = useMarkAllNotificationsSeen();

  const notifications = (data?.results ?? []) as Notification[];

  // Mark all as seen when dropdown opens and there are unread notifications
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAllSeen();
    }
  }, [isOpen, unreadCount, markAllSeen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
        aria-expanded={isOpen}
        className="motion-interactive relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-base-content/10 bg-base-100/70 text-base-content/65 shadow-sm hover:border-primary/35 hover:bg-base-100 hover:text-primary sm:h-11 sm:w-11"
      >
        <NotificationIcon size={20} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[0.58rem] font-bold leading-none text-error-content">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.section
            aria-label="Notification center"
            className="madaar-glass absolute right-0 top-[calc(100%+0.75rem)] z-[60] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl shadow-madaar-floating"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{
              type: "spring",
              bounce: 0,
              duration: motionTokens.duration.standard,
            }}
          >
            <div className="flex items-center justify-between border-b border-base-content/10 px-4 py-4">
              <div>
                <h2 className="text-sm font-bold text-base-content">Notifications</h2>
                <p className="mt-0.5 text-xs text-base-content/45">
                  {unreadCount ? `${unreadCount} new update${unreadCount === 1 ? "" : "s"}` : "You're all caught up"}
                </p>
              </div>
              <NotificationIcon size={20} className="text-primary" />
            </div>

            <div className="max-h-[min(24rem,55vh)] overflow-y-auto p-2">
              {isLoading ? (
                <div className="space-y-2 p-2" aria-label="Loading notifications">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-16 animate-pulse rounded-xl bg-base-200" />
                  ))}
                </div>
              ) : isError ? (
                <EmptyState text="Notifications could not be loaded." />
              ) : notifications.length === 0 ? (
                <EmptyState text="No notifications yet." />
              ) : (
                notifications.map((notification) => (
                  <NotificationRow key={notification.id} notification={notification} />
                ))
              )}
            </div>

            <div className="border-t border-base-content/10 p-2">
              <Link
                to="/notifications"
                onClick={() => setIsOpen(false)}
                className="motion-interactive flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-primary hover:bg-primary/10"
              >
                View all notifications
                <ArrowRight2 size={15} />
              </Link>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};

const NotificationRow = ({ notification }: { notification: Notification }) => {
  const content = (
    <>
      <span
        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.seen ? "bg-success" : "bg-primary"
          }`}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-6 text-base-content/80">{notification.text}</span>
        <span className="mt-1 block text-[0.68rem] text-base-content/45">
          {formatNotificationDate(notification.created_at)}
        </span>
      </span>
    </>
  );

  return (
    <div className="flex gap-3 rounded-xl px-3 py-3">
      {content}
    </div>
  );
};

const EmptyState = ({ text }: { text: string }) => (
  <div className="px-4 py-10 text-center text-xs leading-5 text-base-content/50">{text}</div>
);
