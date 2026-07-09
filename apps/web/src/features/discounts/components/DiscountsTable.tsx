import { motion } from "framer-motion";
import {
  Calendar,
  Copy,
  DiscountShape,
  Edit,
  TickCircle,
  Trash,
  User,
} from "iconsax-reactjs";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmationModal } from "../../../components/ConfirmationModal";
import { formatDate } from "../../../utils/formatDate";
import { useDeleteDiscount } from "../hooks/useDiscounts";
import type { Discount } from "../types";

interface DiscountsTableProps {
  discounts: Discount[];
  isLoading: boolean;
  isError: boolean;
  onEdit: (discount: Discount) => void;
}

export const DiscountsTable = ({
  discounts,
  isLoading,
  isError,
  onEdit,
}: DiscountsTableProps) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteModalState, setDeleteModalState] = useState<{
    open: boolean;
    discount: Discount | null;
  }>({ open: false, discount: null });

  const deleteMutation = useDeleteDiscount();

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success("Code copied");
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleDelete = () => {
    if (deleteModalState.discount) {
      deleteMutation.mutate(deleteModalState.discount.id, {
        onSuccess: () => {
          setDeleteModalState({ open: false, discount: null });
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-base-100 rounded-2xl border border-base-content/10 overflow-hidden">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-base-content/10 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-linear-to-br from-error/5 to-error/10 rounded-2xl border border-error/20 p-12 text-center">
        <div className="text-error/40 mb-4">
          <DiscountShape className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-bold text-error mb-2">Loading Error</h3>
        <p className="text-error/70">There was a problem loading discounts</p>
      </div>
    );
  }

  if (discounts.length === 0) {
    return (
      <div className="bg-linear-to-br from-base-200 to-base-300 rounded-2xl border border-base-content/10 p-12 text-center">
        <div className="text-base-content/40 mb-4">
          <DiscountShape className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-bold text-base-content mb-2">
          No Discounts Found
        </h3>
        <p className="text-base-content/70">
          Create a discount code to get started
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-base-100 rounded-2xl border border-base-content/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-linear-to-r from-primary/10 to-primary/5 border-b border-base-content/10">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-base-content whitespace-nowrap">
                  Code
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-base-content whitespace-nowrap">
                  Value
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-base-content whitespace-nowrap">
                  Usage Limit
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-base-content whitespace-nowrap">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-base-content whitespace-nowrap">
                  Expires
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-base-content whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-content/5">
              {discounts.map((discount, index) => {
                const usagePercent = Math.min(
                  (discount.current_usage / discount.max_usage) * 100,
                  100
                );
                const isExpired =
                  new Date(discount.expiration_date) < new Date();

                return (
                  <motion.tr
                    key={discount.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="hover:bg-base-200 transition-all duration-200 group"
                  >
                    {/* Code Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg shrink-0 text-primary">
                          <DiscountShape size={20} variant="Bold" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-base-content font-mono">
                              {discount.code}
                            </span>
                            <button
                              onClick={() => copyToClipboard(discount.code)}
                              className="text-base-content/40 hover:text-primary transition-colors"
                              title="Copy Code"
                            >
                              {copiedCode === discount.code ? (
                                <TickCircle
                                  size={16}
                                  className="text-success"
                                  variant="Bold"
                                />
                              ) : (
                                <Copy size={16} />
                              )}
                            </button>
                          </div>
                          <div className="text-xs text-base-content/50 max-w-[150px] truncate">
                            {discount.description || "No description"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Value Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-primary">
                          {discount.percent}%
                        </span>
                        <span className="text-xs text-base-content/50 font-medium">
                          OFF
                        </span>
                      </div>
                    </td>

                    {/* Usage Column */}
                    <td className="px-6 py-4">
                      <div className="w-32">
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <span className="text-base-content/70 font-medium flex items-center gap-1">
                            <User size={12} /> {discount.current_usage}
                          </span>
                          <span className="text-base-content/40">
                            / {discount.max_usage}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-base-200 rounded-full overflow-hidden border border-base-content/5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${usagePercent}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className={`h-full rounded-full ${
                              usagePercent >= 100 ? "bg-warning" : "bg-primary"
                            }`}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Status Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          discount.is_active && !isExpired
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-base-200 text-base-content/50 border-base-content/10"
                        }`}
                      >
                        {discount.is_active && !isExpired ? (
                          <TickCircle size={14} className="mr-1" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-base-content/40 mr-1.5" />
                        )}
                        {discount.is_active && !isExpired
                          ? "Active"
                          : isExpired
                          ? "Expired"
                          : "Inactive"}
                      </span>
                    </td>

                    {/* Date Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-base-content/60" />
                        <span className="text-sm text-base-content/70">
                          {formatDate(discount.expiration_date)}
                        </span>
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onEdit(discount)}
                          className="p-2 hover:bg-primary/10 text-base-content/60 hover:text-primary rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteModalState({ open: true, discount })
                          }
                          className="p-2 hover:bg-error/10 text-base-content/60 hover:text-error rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteModalState.open}
        onClose={() => setDeleteModalState({ open: false, discount: null })}
        onConfirm={handleDelete}
        title="Delete Discount"
        message={`Are you sure you want to delete the discount code "${deleteModalState.discount?.code}"?`}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
};
