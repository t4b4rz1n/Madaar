import { AnimatePresence, motion } from "framer-motion";
import { Message } from "iconsax-reactjs";
import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pagination } from "../../../components/Pagination";
import { ViewSwitcher } from "../../../components/ViewSwitcher";
import { FeedbacksGrid } from "../components/FeedbacksGrid";
import { FeedbacksTable } from "../components/FeedbacksTable";
import { FeedbacksToolbar } from "../components/FeedbacksToolbar";
import { useFeedbacks } from "../hooks/useFeedbacks";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

type ViewMode = "grid" | "table";

const FeedbacksListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const {
    data: feedbacksResponse,
    isLoading,
    isFetching,
    isError,
  } = useFeedbacks(searchParams);
  const showLoading = isLoading || isFetching;

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
    [setSearchParams]
  );

  const handlePageChange = (page: number) => {
    updateSearchParams("page", String(page));
  };
  const handlePageSizeChange = (size: number) => {
    updateSearchParams("page_size", String(size));
  };
  const handleSearch = useCallback(
    (query: string) => updateSearchParams("search", query),
    [updateSearchParams]
  );
  const handleSort = useCallback(
    (sortKey: string) => updateSearchParams("ordering", sortKey),
    [updateSearchParams]
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
    [setSearchParams]
  );

  const currentPage = feedbacksResponse?.current_page || 1;
  const pageSize = Number(searchParams.get("page_size")) || 10;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="bg-white min-h-[calc(100vh-121px)] backdrop-blur-lg border border-base-content/10 rounded-2xl p-4 sm:p-6 flex flex-col"
    >
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row md:justify-between md:items-start gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Message size={28} /> Feedback Management
          </h1>
          <p className="text-base-content/70 mt-1">
            View and manage user feedbacks.
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
          <ViewSwitcher
            viewMode={viewMode}
            setViewMode={setViewMode}
            className="w-full sm:w-auto"
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="mt-6">
        <FeedbacksToolbar
          onSearch={handleSearch}
          onSortChange={handleSort}
          onFilterChange={handleFilter}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grow mt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {viewMode === "table" ? (
              <FeedbacksTable
                feedbacks={feedbacksResponse?.results || []}
                isLoading={showLoading}
                isError={isError}
              />
            ) : (
              <FeedbacksGrid
                feedbacks={feedbacksResponse?.results || []}
                isLoading={showLoading}
                isError={isError}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <motion.div variants={itemVariants} className="mt-auto pt-6">
        <Pagination
          currentPage={currentPage}
          totalPages={feedbacksResponse?.total_pages || 1}
          totalCount={feedbacksResponse?.total_results || 0}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </motion.div>
    </motion.div>
  );
};

export default FeedbacksListPage;
