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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-300/60 backdrop-blur-sm p-4">
      <div className="bg-base-100 border border-base-content/10 rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
        
        {/* Header Icon */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-error/10 text-error flex items-center justify-center mb-4">
            <Danger size={32} />
          </div>

          <h3 className="font-bold text-lg text-base-content mb-2">
            Delete Project?
          </h3>

          <p className="text-sm text-base-content/70 leading-relaxed mb-6">
            Are you sure you want to delete <span className="font-semibold text-base-content">"{title}"</span>? This action cannot be undone.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-base-content/10">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="btn btn-ghost rounded-xl border border-base-content/10 flex-1"
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