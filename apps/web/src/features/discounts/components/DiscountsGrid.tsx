import { motion } from "framer-motion";
import {
  Calendar,
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

interface DiscountsGridProps {
  discounts: Discount[];
  isLoading: boolean;
  isError: boolean;
  onEdit: (discount: Discount) => void;
  canManage?: boolean;
}

export const DiscountsGrid = ({
  discounts,
  isLoading,
  isError,
  onEdit,
  canManage = false,
}: DiscountsGridProps) => {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-base-100 rounded-2xl border border-base-content/10 p-6 animate-pulse flex flex-col"
          >
            {/* Header Skeleton */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-base-content/10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-base-content/10 rounded w-24" />
                <div className="h-3 bg-base-content/10 rounded w-16" />
              </div>
            </div>

            {/* Body Skeleton */}
            <div className="bg-base- content/5 rounded-xl h-16 mb-4 w-full" />

            {/* Footer Skeleton */}
            <div className="flex gap-2 pt-4 border-t border-base-content/10 mt-auto">
              <div className="h-9 bg-base-content/10 rounded-lg flex-1" />
              <div className="h-9 bg-base-content/10 rounded-lg flex-1" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError)
    return (
      <div className="text-error text-center p-10">
        Error loading discounts.
      </div>
    );
  if (discounts.length === 0)
    return <div className="text-center p-10">No discounts found.</div>;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {discounts.map((discount, index) => {
          const usagePercent = Math.min(
            (discount.current_usage / discount.max_usage) * 100,
            100
          );
          const isExpired = new Date(discount.expiration_date) < new Date();

          return (
            <motion.div
              key={discount.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group bg-base-100 rounded-2xl border border-base-content/10 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
            >
              {/* Header: Icon + Code + Percent */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-full overflow-hidden bg-primary/10 shrink-0 flex items-center justify-center border-2 border-base-100 shadow-sm cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => copyToClipboard(discount.code)}
                >
                  <DiscountShape
                    className="w-6 h-6 text-primary"
                    variant="Bold"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className="text-lg font-bold text-base-content truncate cursor-pointer hover:text-primary transition-colors"
                      onClick={() => copyToClipboard(discount.code)}
                    >
                      {discount.code}
                    </h3>
                    {copiedCode === discount.code && (
                      <TickCircle
                        size={16}
                        className="text-success"
                        variant="Bold"
                      />
                    )}
                  </div>
                  <p className="text-sm font-medium text-primary">
                    {discount.percent}% OFF
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                    discount.is_active && !isExpired
                      ? "bg-success/10 text-success border-success/20"
                      : "bg-base-200 text-base-content/40 border-base-content/10"
                  }`}
                >
                  {discount.is_active && !isExpired ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Body: Usage Bar (Like Email box in UsersGrid) */}
              <div className="mb-4 bg-base-200/50 p-3 rounded-xl">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-base-content/60 flex items-center gap-1">
                    <User size={12} /> Usage
                  </span>
                  <span className="font-medium">
                    {discount.current_usage}/{discount.max_usage}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-base-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      usagePercent >= 100 ? "bg-warning" : "bg-primary"
                    }`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>

              {/* Footer: Date & Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-base-content/10 mt-auto">
                <div className="flex items-center gap-1.5 text-xs text-base-content/60">
                  <Calendar size={14} />
                  <span>{formatDate(discount.expiration_date)}</span>
                </div>

                {canManage && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(discount)}
                      className="p-1.5 hover:bg-base-200 rounded-lg text-base-content/60 hover:text-primary transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() =>
                        setDeleteModalState({ open: true, discount })
                      }
                      className="p-1.5 hover:bg-error/10 rounded-lg text-base-content/60 hover:text-error transition-colors"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
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
