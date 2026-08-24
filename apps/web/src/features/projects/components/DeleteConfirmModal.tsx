import React from "react";
import { Trash, Danger } from "iconsax-reactjs";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  title?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  title = "this project",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        className="madaar-surface w-full max-w-md rounded-[28px] border border-base-content/10 bg-base-100 p-7 shadow-2xl animate-in fade-in zoom-in duration-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-error/10 text-error flex items-center justify-center mb-4">
            <Danger size={32} />
          </div>

          <h3 className="text-xl font-semibold text-base-content mb-2">
            Delete Project?
          </h3>

          <p className="text-sm text-base-content/60 leading-relaxed mb-6">
            Are you sure you want to delete <span className="font-semibold text-base-content">"{title}"</span>? This action cannot be undone.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 border-t border-base-content/10 pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="btn btn-ghost rounded-xl flex-1"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="btn btn-error rounded-xl text-white gap-2 flex-1"
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <Trash size={18} />
            )}
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
