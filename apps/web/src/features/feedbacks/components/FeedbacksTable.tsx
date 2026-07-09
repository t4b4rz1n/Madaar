import { useState } from "react";
import { motion } from "framer-motion";
import {
  Message,
  User,
  Calendar,
  Trash,
  InfoCircle,
  Eye,
} from "iconsax-reactjs";
import { formatDate } from "../../../utils/formatDate";
import type { Feedback } from "../types";
import { ConfirmationModal } from "../../../components/ConfirmationModal";
import { useDeleteFeedback } from "../hooks/useFeedbacks";
import { FeedbackDetailModal } from "./FeedbackDetailModal";

interface FeedbacksTableProps {
  feedbacks: Feedback[];
  isLoading: boolean;
  isError: boolean;
}

export const FeedbacksTable = ({
  feedbacks,
  isLoading,
  isError,
}: FeedbacksTableProps) => {
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
      <div className="bg-base-100 rounded-2xl border border-base-content/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-linear-to-r from-primary/10 to-primary/5 border-b border-base-content/10">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-base-content whitespace-nowrap">
                  User
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-base-content whitespace-nowrap">
                  Subject
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-base-content whitespace-nowrap">
                  Message
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-base-content whitespace-nowrap">
                  Created
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-base-content whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-content/5">
              {feedbacks.map((feedback, index) => (
                <motion.tr
                  key={feedback.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="hover:bg-base-200 transition-all duration-200 group"
                >
                  {/* User */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-sm font-bold text-base-content">
                        {feedback.user}
                      </div>
                    </div>
                  </td>

                  {/* Subject */}
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      <p className="text-sm font-semibold text-base-content line-clamp-1">
                        {feedback.subject}
                      </p>
                    </div>
                  </td>

                  {/* Message */}
                  <td className="px-6 py-4">
                    <div className="max-w-md">
                      {feedback.text ? (
                        <div className="flex items-start gap-2">
                          <InfoCircle className="w-4 h-4 text-base-content/60 shrink-0 mt-0.5" />
                          <p className="text-sm text-base-content/80 line-clamp-2">
                            {feedback.text}
                          </p>
                          {feedback.text.length > 100 && (
                            <button
                              onClick={() =>
                                setDetailModalState({ open: true, feedback })
                              }
                              className="shrink-0 p-1 hover:bg-primary/10 text-base-content/60 hover:text-primary rounded transition-colors"
                              title="View full message"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-base-content/40">-</span>
                      )}
                    </div>
                  </td>

                  {/* Created Date */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-base-content/60" />
                      <span className="text-sm text-base-content/70">
                        {formatDate(feedback.created_at)}
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setDeleteModalState({ open: true, feedback })
                        }
                        className="p-2 hover:bg-error/10 text-base-content/60 hover:text-error rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
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
