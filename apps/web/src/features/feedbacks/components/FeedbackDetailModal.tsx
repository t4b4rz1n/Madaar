import { motion, AnimatePresence } from "framer-motion";
import { Message, CloseCircle, User, Calendar } from "iconsax-reactjs";
import { createPortal } from "react-dom";
import type { Feedback } from "../types";

interface FeedbackDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: Feedback | null;
}

const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 30, scale: 0.98 },
};

export const FeedbackDetailModal = ({
  isOpen,
  onClose,
  feedback,
}: FeedbackDetailModalProps) => {
  if (!feedback) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            className="relative w-full max-w-2xl bg-base-100 rounded-2xl shadow-xl m-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-base-content/10 bg-linear-to-r from-primary/5 to-primary/10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-3 bg-primary/10 rounded-xl shrink-0">
                    <Message className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-base-content mb-2">
                      {feedback.subject}
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-base-content/70">
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{feedback.user}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(feedback.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-base-content/10 rounded-lg transition-colors shrink-0"
                >
                  <CloseCircle className="w-6 h-6 text-base-content/60" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="bg-base-200/50 rounded-xl p-4">
                <p className="text-base-content/80 whitespace-pre-wrap leading-relaxed">
                  {feedback.text}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-base-content/10 bg-base-200/30">
              <div className="flex items-center justify-end">
                <button
                  onClick={onClose}
                  className="btn btn-primary rounded-xl px-6"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
};
