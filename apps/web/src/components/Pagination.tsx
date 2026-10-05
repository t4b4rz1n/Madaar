import { formatNumber, useTranslation } from "../i18n/locale";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown2, ArrowLeft2, ArrowRight2 } from "iconsax-reactjs";
import { useMemo } from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const pageSizes = [10, 20, 50, 100];

export const Pagination = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) => {
  const t = useTranslation();
  const [startItem, endItem] = useMemo(() => {
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalCount);
    return [start, end];
  }, [currentPage, pageSize, totalCount]);

  if (totalPages <= 0) {
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
      <div className="dropdown dropdown-top">
        <motion.button
          tabIndex={0}
          className="btn btn-ghost rounded-full text-sm"
          whileTap={{ scale: 0.95 }}
        >
          {t("Show")} {formatNumber(pageSize)}  {t("items")}<ArrowDown2 size={16} className="text-heledone-ink-muted" />
        </motion.button>
        <ul
          tabIndex={0}
          className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32 border border-base-content/10"
        >
          {pageSizes.map((size) => (
            <li
              key={formatNumber(size)}
              onClick={() => {
                onPageSizeChange(size);
                (document.activeElement as HTMLElement)?.blur();
              }}
            >
              <a className={pageSize === size ? "active" : ""}>{formatNumber(size)}</a>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-2">
        <motion.button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn btn-ghost btn-circle disabled:opacity-40"
          whileTap={{ scale: 0.9 }}
          aria-label={t("Previous Page")}
        >
          <ArrowLeft2 className="rtl:rotate-180" size={18} />
        </motion.button>

        <div className="font-bold text-base-content/80 text-sm px-2 flex gap-2">
          <p>{t("Page")}</p>
          <span>{formatNumber(currentPage)}</span>
          <p>{t("of")}</p>
          {formatNumber(totalPages)}
        </div>

        <motion.button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn btn-ghost btn-circle disabled:opacity-40"
          whileTap={{ scale: 0.9 }}
          aria-label={t("Next Page")}
        >
          <ArrowRight2 className="rtl:rotate-180" size={18} />
        </motion.button>
      </div>

      <div className="text-sm font-semibold text-base-content/70 px-4">
        <AnimatePresence mode="wait">
          <motion.span
            key={currentPage + "-" + pageSize}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {formatNumber(startItem)}-{formatNumber(endItem)}  {t("of")} {formatNumber(totalCount)}  {t("results")}</motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
};
