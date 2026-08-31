import { motion } from "framer-motion";
import { Notification as NotificationIcon, Send } from "iconsax-reactjs";
import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pagination } from "../../../components/Pagination";
import { ViewSwitcher } from "../../../components/ViewSwitcher";
import { NotificationHistoryList } from "../components/NotificationHistoryList";
import { NotificationsToolbar } from "../components/NotificationsToolbar"; // Import Toolbar
import { SendNotificationModal } from "../components/SendNotificationModal";
import { useNotificationHistory } from "../hooks/useNotifications";
// import { useAuthStore } from "../../auth/store/authStore";
import { PermissionGuard } from "../../auth/components/PermissionGuard";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

const NotificationsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  // const isStaff = useAuthStore((state) => state.user?.is_staff === true);
  const {
    data: notificationsResponse,
    isLoading,
    isFetching,
    isError,
  } = useNotificationHistory(searchParams);
  const showLoading = isLoading || isFetching;

  // Centralized param updater
  const updateSearchParams = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        if (value) {
          newParams.set(key, value);
        } else {
          newParams.delete(key);
        }
        if (key !== "page") {
          newParams.set("page", "1");
        }
        return newParams;
      });
    },
    [setSearchParams],
  );

  const handlePageChange = useCallback(
    (page: number) => updateSearchParams("page", String(page)),
    [updateSearchParams],
  );

  const handlePageSizeChange = useCallback(
    (size: number) => updateSearchParams("page_size", String(size)),
    [updateSearchParams],
  );

  // Handlers for Toolbar
  const handleSearch = useCallback(
    (query: string) => updateSearchParams("search", query),
    [updateSearchParams],
  );

  const handleSort = useCallback(
    (sortKey: string) => updateSearchParams("ordering", sortKey),
    [updateSearchParams],
  );

  const handleFilter = useCallback(
    (filters: Record<string, string>) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        Object.entries(filters).forEach(([key, value]) => {
          if (value) {
            newParams.set(key, value);
          } else {
            newParams.delete(key);
          }
        });
        newParams.set("page", "1");
        return newParams;
      });
    },
    [setSearchParams],
  );

  const openSendModal = () => setSendModalOpen(true);
  const closeSendModal = () => setSendModalOpen(false);

  const currentPage = notificationsResponse?.current_page || 1;
  const pageSize = Number(searchParams.get("page_size")) || 10;
  const totalResults = notificationsResponse?.total_results || 0;
  const totalPages = notificationsResponse?.total_pages || 1;

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="bg-base-100 min-h-[calc(100vh-121px)] backdrop-blur-lg border border-base-content/10 rounded-2xl p-4 sm:p-6 flex flex-col"
      >
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row md:justify-between md:items-start gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <NotificationIcon size={28} /> Notifications
            </h1>
            <p className="text-base-content/70 mt-1">
              Send notifications and view their history.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ViewSwitcher
              viewMode={viewMode}
              setViewMode={setViewMode}
              className="w-auto"
            />
            <PermissionGuard permissions={["org.manage_settings"]}>
              <button
                className="btn btn-primary rounded-xl"
                onClick={openSendModal}
              >
                <Send />
                <span>Send New Notification</span>
              </button>
            </PermissionGuard>
          </div>
        </motion.div>

        {/* Added Toolbar */}
        <motion.div variants={itemVariants} className="mt-6">
          <NotificationsToolbar
            onSearch={handleSearch}
            onSortChange={handleSort}
            onFilterChange={handleFilter}
          />
        </motion.div>

        <motion.div variants={itemVariants} className="grow mt-6">
          <NotificationHistoryList
            notifications={notificationsResponse?.results || []}
            isLoading={showLoading}
            isError={isError}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        </motion.div>

        <motion.div variants={itemVariants} className="mt-auto pt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalResults}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </motion.div>
      </motion.div>

      <SendNotificationModal isOpen={sendModalOpen} onClose={closeSendModal} />
    </>
  );
};

export default NotificationsPage;
