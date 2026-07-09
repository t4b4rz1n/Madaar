import { motion } from "framer-motion";
import { Calendar, User, Message, Trash, Eye } from "iconsax-reactjs";
import { formatDate } from "../../../utils/formatDate";
import type { Feedback } from "../types";
import { useState } from "react";
import { ConfirmationModal } from "../../../components/ConfirmationModal";
import { useDeleteFeedback } from "../hooks/useFeedbacks";
import { FeedbackDetailModal } from "./FeedbackDetailModal";

interface FeedbacksGridProps {
  feedbacks: Feedback[];
  isLoading: boolean;
  isError: boolean;
}

export const FeedbacksGrid = ({
  feedbacks,
  isLoading,
  isError,
}: FeedbacksGridProps) => {
  const [deleteModalState, setDeleteModalState] = useState<{
    open: boolean;
    feedback: Feedback | null;
  }>({ open: false, feedback: null });

  const [detailModalState, setDetailModalState] = useState<{
    open: boolean;
    feedback: Feedback | null;
  }>({ open: false, feedback: null });

  const deleteMutation = useDeleteFeedback();

  const handleDelete = () => {
    if (deleteModalState.feedback) {
      deleteMutation.mutate(deleteModalState.feedback.id, {
        onSuccess: () => {
          setDeleteModalState({ open: false, feedback: null });
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
            className="bg-base-100 rounded-2xl border border-base-content/10 p-6 animate-pulse"
          >
            {/* User Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-base-content/10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-base-content/10 rounded w-24" />
                <div className="h-3 bg-base-content/10 rounded w-32" />
              </div>
            </div>

            {/* Subject */}
            <div className="mb-4">
              <div className="h-4 bg-base-content/10 rounded w-full" />
            </div>

            {/* Message */}
            <div className="mb-4 space-y-2">
              <div className="h-4 bg-base-content/10 rounded w-full" />
              <div className="h-4 bg-base-content/10 rounded w-3/4" />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-base-content/10">
              <div className="h-8 bg-base-content/10 rounded w-24" />
              <div className="flex gap-2">
                <div className="h-10 w-10 bg-base-content/10 rounded-lg" />
                <div className="h-10 w-10 bg-base-content/10 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-linear-to-br from-error/5 to-error/10 rounded-2xl border border-error/20 p-12 text-center">
        <div className="text-error/40 mb-4">
          <svg
            className="w-16 h-16 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-error mb-2">Loading Error</h3>
        <p className="text-error/70">There was a problem loading feedbacks</p>
      </div>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <div className="bg-linear-to-br from-base-200 to-base-300 rounded-2xl border border-base-content/10 p-12 text-center">
        <div className="text-base-content/40 mb-4">
          <Message className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-bold text-base-content mb-2">
          No Feedbacks Found
        </h3>
        <p className="text-base-content/70">
          No feedback messages have been submitted yet
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {feedbacks.map((feedback, index) => (
          <motion.div
            key={feedback.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="group bg-base-100 rounded-2xl border border-base-content/10 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
          >
            {/* User Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-base-content truncate">
                  {feedback.user}
                </h3>
                <p className="text-xs text-base-content/60">
                  {formatDate(feedback.created_at)}
                </p>
              </div>
            </div>

            {/* Subject */}
            <div className="mb-3">
              <div className="flex items-start gap-2">
                <Message className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-base-content line-clamp-2 flex-1">
                  {feedback.subject}
                </p>
              </div>
            </div>

            {/* Message Preview */}
            <div className="mb-4 flex-1">
              <p className="text-sm text-base-content/70 line-clamp-3">
                {feedback.text}
              </p>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-base-content/10">
              <div className="flex items-center gap-1 text-xs text-base-content/60">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {new Date(feedback.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {feedback.text.length > 100 && (
                  <button
                    onClick={() =>
                      setDetailModalState({ open: true, feedback })
                    }
                    className="p-2 hover:bg-primary/10 text-base-content/60 hover:text-primary rounded-lg transition-colors"
                    title="View full message"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => setDeleteModalState({ open: true, feedback })}
                  className="p-2 hover:bg-error/10 text-base-content/60 hover:text-error rounded-lg transition-colors"
                  title="Delete feedback"
                >
                  <Trash className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <ConfirmationModal
        isOpen={deleteModalState.open}
        onClose={() => setDeleteModalState({ open: false, feedback: null })}
        onConfirm={handleDelete}
        title="Delete Feedback"
        message={`Are you sure you want to delete this feedback from "${deleteModalState.feedback?.user}"? This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />

      <FeedbackDetailModal
        isOpen={detailModalState.open}
        onClose={() => setDetailModalState({ open: false, feedback: null })}
        feedback={detailModalState.feedback}
      />
    </>
  );
};
