import { motion } from "framer-motion";
import {
  CloseCircle,
  Edit,
  Message,
  TickCircle,
  Trash,
  User as UserIcon,
} from "iconsax-reactjs";
import { useState } from "react";
import { ConfirmationModal } from "../../../components/ConfirmationModal";
import { useDeleteUser } from "../hooks/useUsers";
import type { User } from "../types";

interface UsersTableProps {
  users: User[];
  isLoading: boolean;
  isError: boolean;
  onEdit: (user: User) => void;
}

export const UsersTable = ({
  users,
  isLoading,
  isError,
  onEdit,
}: UsersTableProps) => {
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
      <div className="bg-base-100 rounded-2xl border border-base-content/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-linear-to-r from-primary/10 to-primary/5 border-b border-base-content/10">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-base-content whitespace-nowrap">
                  User
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-base-content whitespace-nowrap">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-base-content whitespace-nowrap">
                  Full Name
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-base-content whitespace-nowrap">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-base-content whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-content/5">
              {users.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="hover:bg-base-200 transition-all duration-200 group"
                >
                  {/* User */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 shrink-0 flex items-center justify-center border border-base-200">
                        {user.profile_image ? (
                          <img
                            src={user.profile_image}
                            alt={user.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-base-content">
                          {user.username}
                        </div>
                        <div className="text-xs text-base-content/50">
                          ID: #{user.id}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Message className="w-4 h-4 text-base-content/60" />
                      <span className="text-sm text-base-content/80">
                        {user.email}
                      </span>
                    </div>
                  </td>

                  {/* Full Name */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-base-content/80 font-medium">
                      {user.first_name} {user.last_name}
                    </span>
                  </td>

                  {/* Status Badges */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          user.is_active
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-error/10 text-error border-error/20"
                        }`}
                      >
                        {user.is_active ? (
                          <TickCircle size="12" className="mr-1" />
                        ) : (
                          <CloseCircle size="12" className="mr-1" />
                        )}
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                      {user.is_staff && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                          Staff
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEdit(user)}
                        className="p-2 hover:bg-primary/10 text-base-content/60 hover:text-primary rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteModalState({ open: true, user })
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
        onClose={() => setDeleteModalState({ open: false, user: null })}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete the user "${deleteModalState.user?.username}"? This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
};
