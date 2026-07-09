import { motion, AnimatePresence } from "framer-motion";
import { Add, Edit, Trash, CloseCircle, Category, SearchNormal1, Sort, ArrowUp2, ArrowDown2 } from "iconsax-reactjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pagination } from "../../../components/Pagination";
import { ConfirmationModal } from "../../../components/ConfirmationModal";
import {
  useTicketTypes,
  useCreateTicketType,
  useUpdateTicketType,
  useDeleteTicketType,
} from "../hooks/useTickets";
import type { TicketTypeItem } from "../types";
import InputField from "../../../components/InputField";
import { formatDate } from "../../../utils/formatDate";
import { useDebounce } from "../../../hooks/useDebounce";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function TicketTypesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Create/Edit/Delete modals state
  const [modalState, setModalState] = useState<{
    open: boolean;
    ticketType: TicketTypeItem | null;
    name: string;
  }>({ open: false, ticketType: null, name: "" });

  const [deleteModalState, setDeleteModalState] = useState<{
    open: boolean;
    ticketType: TicketTypeItem | null;
  }>({ open: false, ticketType: null });

  const { data: ticketTypesResponse, isLoading, isError } = useTicketTypes(searchParams);

  const createMutation = useCreateTicketType();
  const updateMutation = useUpdateTicketType();
  const deleteMutation = useDeleteTicketType();

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

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") || "");
  const [sortConfig, setSortConfig] = useState<{ key: "name"; dir: "asc" | "desc" }>(() => {
    const ordering = searchParams.get("ordering") || "";
    const dir = ordering.startsWith("-") ? "desc" : "asc";
    return { key: "name", dir };
  });

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const updateSearchRef = useRef((query: string) => {
    const currentSearch = searchParams.get("search") || "";
    if (currentSearch !== query) {
      updateSearchParams("search", query);
    }
  });

  useEffect(() => {
    updateSearchRef.current(debouncedSearchQuery);
  }, [debouncedSearchQuery]);

  useEffect(() => {
    const sortPrefix = sortConfig.dir === "desc" ? "-" : "";
    const currentOrdering = searchParams.get("ordering") || "";
    const newOrdering = `${sortPrefix}${sortConfig.key}`;
    if (currentOrdering !== newOrdering) {
      updateSearchParams("ordering", newOrdering);
    }
  }, [sortConfig, searchParams, updateSearchParams]);

  const currentPage = ticketTypesResponse?.current_page || 1;
  const pageSize = Number(searchParams.get("page_size")) || 10;
  const totalPages = ticketTypesResponse?.total_pages || 1;
  const totalResults = ticketTypesResponse?.total_results || 0;

  const handlePageChange = useCallback(
    (page: number) => updateSearchParams("page", page.toString()),
    [updateSearchParams]
  );

  const handlePageSizeChange = useCallback(
    (size: number) => updateSearchParams("page_size", size.toString()),
    [updateSearchParams]
  );

  const handleSave = () => {
    if (modalState.name.trim() === "") return;

    if (modalState.ticketType) {
      updateMutation.mutate(
        { id: modalState.ticketType.id, name: modalState.name },
        {
          onSuccess: () => setModalState({ open: false, ticketType: null, name: "" }),
        }
      );
    } else {
      createMutation.mutate(modalState.name, {
        onSuccess: () => setModalState({ open: false, ticketType: null, name: "" }),
      });
    }
  };

  const handleDelete = () => {
    if (deleteModalState.ticketType) {
      deleteMutation.mutate(deleteModalState.ticketType.id, {
        onSuccess: () => setDeleteModalState({ open: false, ticketType: null }),
      });
    }
  };

  const ticketTypes = useMemo(
    () => ticketTypesResponse?.results || [],
    [ticketTypesResponse?.results]
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="bg-base-100 min-h-[calc(100vh-121px)] backdrop-blur-lg border border-base-content/10 rounded-2xl p-4 sm:p-6 flex flex-col"
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row md:justify-between md:items-start gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-base-content">
              <Category size={28} /> Ticket Categories
            </h1>
            <p className="text-base-content/70 mt-1">
              Manage ticket types and departments.
            </p>
          </div>
          <button
            onClick={() => setModalState({ open: true, ticketType: null, name: "" })}
            className="btn btn-primary rounded-xl gap-2 self-start md:self-auto"
          >
            <Add size={20} />
            <span>Create Category</span>
          </button>
        </motion.div>

        {/* Toolbar */}
        <motion.div variants={itemVariants} className="mt-6">
          <div className="flex flex-col md:flex-row items-center gap-3 w-full p-2 bg-linear-to-r from-base-100 to-base-200/40 border-base-content/10 rounded-2xl">
            <div className="grow w-full">
              <InputField
                name="search"
                placeholder="Search categories..."
                icon={<SearchNormal1 size={18} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                classNameInput="!bg-transparent !shadow-none"
              />
            </div>
            <div className="flex items-center gap-1 border border-base-content/10 rounded-xl p-1 bg-base-100/50">
              <div className="dropdown dropdown-end">
                <button tabIndex={0} className="btn btn-ghost rounded-xl hover:bg-primary/10 hover:text-primary border-none flex-nowrap h-[42px] min-h-[42px] px-3">
                  <Sort size={18} />
                  <span className="font-semibold mx-1 whitespace-nowrap text-sm">
                    Category Name
                  </span>
                </button>
              </div>
              <button
                onClick={() => setSortConfig((prev) => ({ ...prev, dir: prev.dir === "asc" ? "desc" : "asc" }))}
                className="btn btn-ghost rounded-xl hover:bg-primary/10 hover:text-primary border-none btn-circle w-[42px] h-[42px] min-h-[42px]"
              >
                {sortConfig.dir === "asc" ? <ArrowUp2 size={16} /> : <ArrowDown2 size={16} />}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Content Table */}
        <motion.div variants={itemVariants} className="grow mt-6">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-base-content/10 rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <div className="bg-linear-to-br from-error/5 to-error/10 rounded-2xl border border-error/20 p-12 text-center">
              <CloseCircle className="w-16 h-16 mx-auto text-error" />
              <h3 className="text-lg font-bold text-error mt-4">Error Loading Data</h3>
              <p className="text-error/70">There was an issue fetching the categories list. Please try again.</p>
            </div>
          ) : ticketTypes.length === 0 ? (
            <div className="bg-linear-to-br from-base-200 to-base-300 rounded-2xl border border-base-content/10 p-12 text-center">
              <Category className="w-16 h-16 mx-auto text-base-content/40" />
              <h3 className="text-lg font-bold text-base-content mt-4">No categories defined</h3>
              <p className="text-base-content/70">Add the first category to get started.</p>
            </div>
          ) : (
            <div className="bg-base-100 rounded-2xl border border-base-content/10 overflow-hidden">
              <table className="w-full">
                <thead className="bg-linear-to-r from-primary/10 to-primary/5 border-b border-base-content/10">
                  <tr>
                    <th className="px-6 py-4 text-start text-sm font-bold text-base-content">
                      Category Name
                    </th>
                    <th className="px-6 py-4 text-start text-sm font-bold text-base-content">
                      Created At
                    </th>
                    <th className="px-6 py-4 text-start text-sm font-bold text-base-content">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-base-content/5">
                  {ticketTypes.map((item, idx) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.05 }}
                      className="hover:bg-base-200 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-bold text-base-content">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 text-xs text-base-content/65">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setModalState({ open: true, ticketType: item, name: item.name })}
                            className="p-1.5 hover:bg-primary/10 text-base-content/60 hover:text-primary rounded-lg"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteModalState({ open: true, ticketType: item })}
                            className="p-1.5 hover:bg-error/10 text-base-content/60 hover:text-error rounded-lg"
                            title="Delete"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Pagination */}
        <motion.div variants={itemVariants} className="mt-auto pt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalCount={totalResults}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </motion.div>
      </motion.div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {modalState.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-base-100 rounded-2xl shadow-xl flex flex-col"
            >
              <div className="p-6 border-b border-base-content/10 flex justify-between items-center">
                <h3 className="font-bold text-xl text-base-content">
                  {modalState.ticketType ? "Edit Category" : "Add Category"}
                </h3>
                <button
                  onClick={() => setModalState({ open: false, ticketType: null, name: "" })}
                  className="p-1.5 hover:bg-base-content/10 rounded-lg"
                >
                  <CloseCircle size={24} />
                </button>
              </div>

              <div className="p-6">
                <div className="form-control w-full">
                  <div className="label mb-1.5">
                    <span className="label-text font-semibold">Category Name</span>
                  </div>
                  <InputField
                    name="name"
                    value={modalState.name}
                    onChange={(e) =>
                      setModalState((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Category name..."
                  />
                </div>
              </div>

              <div className="p-6 border-t border-base-content/10 bg-base-200/30 rounded-b-2xl flex justify-end gap-3">
                <button
                  onClick={() => setModalState({ open: false, ticketType: null, name: "" })}
                  className="btn btn-ghost rounded-xl"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || modalState.name.trim() === ""}
                  className="btn btn-primary rounded-xl px-6"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={deleteModalState.open}
        onClose={() => setDeleteModalState({ open: false, ticketType: null })}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Are you sure you want to delete the category "${deleteModalState.ticketType?.name}"?`}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
