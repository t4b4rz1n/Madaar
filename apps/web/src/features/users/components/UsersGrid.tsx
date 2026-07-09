import { motion } from "framer-motion";
import {
  CloseCircle,
  Edit,
  Message,
  TickCircle,
  Trash,
  User as UserIcon,
  Verify,
} from "iconsax-reactjs";
import { useState } from "react";
import { ConfirmationModal } from "../../../components/ConfirmationModal";
import { useDeleteUser } from "../hooks/useUsers";
import type { User } from "../types";

interface UsersGridProps {
  users: User[];
  isLoading: boolean;
  isError: boolean;
  onEdit: (user: User) => void;
}

export const UsersGrid = ({
  users,
  isLoading,
  isError,
  onEdit,
}: UsersGridProps) => {
  const [deleteModalState, setDeleteModalState] = useState<{
    open: boolean;
    user: User | null;
  }>({ open: false, user: null });

  const deleteMutation = useDeleteUser();

  const handleDelete = () => {
    if (deleteModalState.user) {
      deleteMutation.mutate(deleteModalState.user.id, {
        onSuccess: () => {
          setDeleteModalState({ open: false, user: null });
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
              <div className="w-14 h-14 bg-base-content/10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-base-content/10 rounded w-24" />
                <div className="h-3 bg-base-content/10 rounded w-32" />
              </div>
            </div>

            {/* Email Skeleton */}
            <div className="bg-base-content/5 rounded-xl h-12 mb-4 w-full" />

            {/* Footer Skeleton */}
            <div className="flex justify-between items-center pt-4 border-t border-base-content/10 mt-auto">
              <div className="h-6 bg-base-content/10 rounded w-20" />
              <div className="flex gap-2">
                <div className="h-8 w-8 bg-base-content/10 rounded-lg" />
                <div className="h-8 w-8 bg-base-content/10 rounded-lg" />
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
          <CloseCircle className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-bold text-error mb-2">Loading Error</h3>
        <p className="text-error/70">There was a problem loading users</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-linear-to-br from-base-200 to-base-300 rounded-2xl border border-base-content/10 p-12 text-center">
        <div className="text-base-content/40 mb-4">
          <UserIcon className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-bold text-base-content mb-2">
          No Users Found
        </h3>
        <p className="text-base-content/70">
          No users match your search criteria
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="group bg-base-100 rounded-2xl border border-base-content/10 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
          >
            {/* Header: Avatar + Info */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-primary/5 shrink-0 flex items-center justify-center border border-base-200 shadow-sm">
                {user.profile_image ? (
                  <img
                    src={user.profile_image}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon
                    className="w-7 h-7 text-primary/80"
                    variant="Bold"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-base-content truncate leading-tight">
                  {user.username}
                </h3>
                <p className="text-sm text-base-content/60 truncate mt-0.5">
                  {user.first_name} {user.last_name}
                </p>
              </div>
            </div>

            {/* Body: Email */}
            <div className="mb-5 bg-base-200/40 border border-base-content/5 p-3.5 rounded-xl flex items-center gap-3">
              <div className="p-1.5 bg-base-100 rounded-lg shadow-sm text-primary">
                <Message size={16} variant="Bold" />
              </div>
              <p className="text-sm text-base-content/80 truncate font-medium flex-1">
                {user.email}
              </p>
            </div>

            {/* Footer: Status + Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-base-content/10 mt-auto">
              {/* Left: Status Badges */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    user.is_active
                      ? "bg-success/5 text-success border-success/20"
                      : "bg-base-200 text-base-content/50 border-base-content/10"
                  }`}
                >
                  {user.is_active ? (
                    <TickCircle size={14} variant="Bold" />
                  ) : (
                    <CloseCircle size={14} variant="Bold" />
                  )}
                  {user.is_active ? "Active" : "Inactive"}
                </span>
                {user.is_staff && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-primary/5 text-primary border border-primary/20"
                    title="Staff Member"
                  >
                    <Verify size={14} variant="Bold" />
                    <span className="hidden sm:inline">Staff</span>
                  </span>
                )}
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEdit(user)}
                  className="btn btn-ghost btn-sm btn-square rounded-lg text-base-content/60 hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Edit User"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => setDeleteModalState({ open: true, user })}
                  className="btn btn-ghost btn-sm btn-square rounded-lg text-base-content/60 hover:text-error hover:bg-error/10 transition-colors"
                  title="Delete User"
                >
                  <Trash size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <ConfirmationModal
        isOpen={deleteModalState.open}
        onClose={() => setDeleteModalState({ open: false, user: null })}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete the user "${deleteModalState.user?.username}"? This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
};
