import { motion } from "framer-motion";
import {
  Building3,
  CloseCircle,
  Edit,
  Message,
  Trash,
  User as UserIcon,
  Verify,
} from "iconsax-reactjs";
import { useState } from "react";
import { ConfirmationModal } from "../../../components/ConfirmationModal";
import { useRoles } from "../../roles/hooks/useRoles";
import { useDeleteUser } from "../hooks/useUsers";
import type { User } from "../types";
import { usePermissions } from "../../auth/hooks/usePermissions";
import {
  getRoleName,
  getRoleIcon,
} from "../utils/roleBadges";

interface UsersGridProps {
  users: User[];
  isLoading: boolean;
  isError: boolean;
  onEdit: (user: User) => void;
  canManage?: boolean;
}

export const UsersGrid = ({
  users,
  isLoading,
  isError,
  onEdit,
  canManage = false,
}: UsersGridProps) => {
  const [deleteModalState, setDeleteModalState] = useState<{
    open: boolean;
    user: User | null;
  }>({ open: false, user: null });

  const deleteMutation = useDeleteUser();
  const { data: rolesData } = useRoles();
  const roles = rolesData?.results || [];
  const { hasAnyPermission } = usePermissions();

  const hasUserManagePermission = hasAnyPermission(["org.manage_members", "org.manage_settings"]);
  const showActionButtons = canManage || hasUserManagePermission;
  const handleDelete = async () => {
    if (deleteModalState.user) {
      try {
        await deleteMutation.mutateAsync(deleteModalState.user.id);
        setDeleteModalState({ open: false, user: null });
      } catch {
        // Handled in mutation onError
      }
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-base-100/50 backdrop-blur-xl rounded-2xl border border-base-content/8 p-6 animate-pulse flex flex-col shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-base-content/5 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-base-content/5 rounded w-24" />
                <div className="h-3 bg-base-content/5 rounded w-32" />
              </div>
            </div>

            <div className="bg-base-content/5 rounded-xl h-12 mb-4 w-full" />

            <div className="flex justify-between items-center pt-4 border-t border-base-content/8 mt-auto">
              <div className="h-6 bg-base-content/5 rounded w-20" />
              <div className="flex gap-2">
                <div className="h-8 w-8 bg-base-content/5 rounded-lg" />
                <div className="h-8 w-8 bg-base-content/5 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-linear-to-br from-error/5 to-error/10 rounded-2xl border border-error/20 p-12 text-center backdrop-blur-md">
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
      <div className="bg-base-100/50 backdrop-blur-xl rounded-2xl border border-base-content/8 p-12 text-center shadow-sm">
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
        {users.map((user, index) => {
          const roleName = getRoleName(user.role_id, roles, user.role_name);

          return (

            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group relative flex flex-col justify-between rounded-2xl border border-base-content/10 bg-base-100/30 p-5 backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:border-base-content/25 hover:bg-base-100/50 hover:shadow-xl"
            >
              {/* Avatar section with status dot */}
              <div className="flex items-center gap-4 mb-5">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-primary/5 flex items-center justify-center border border-base-content/10 shadow-sm ring-2 ring-base-content/5">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon
                      className="w-7 h-7 text-primary/70"
                      variant="Bold"
                    />
                  )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-base-100 bg-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-lg font-bold text-base-content truncate leading-tight tracking-tight">
                      {user.username}
                    </h3>
                    {/* Organization badge inline next to name */}
                    {user.organization?.name && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/5 text-primary border border-primary/15 leading-none shadow-sm">
                        <Building3 size={10} />
                        {user.organization.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-base-content/50 truncate mt-0.5 font-medium">
                    {user.first_name} {user.last_name}
                  </p>
                </div>
              </div>

              {/* Contact chip */}
              <div className="mb-5 bg-base-200/40 backdrop-blur-md border border-base-content/5 p-3 rounded-xl flex items-center gap-3">
                <div className="p-1.5 bg-base-100/80 rounded-lg text-primary">
                  <Message size={14} variant="Bold" />
                </div>
                <p className="text-sm text-base-content/70 truncate font-medium flex-1">
                  {user.email}
                </p>
              </div>

              {/* Stats/Meta row */}
              <div className="flex items-center justify-between pt-4 border-t border-base-content/8 mt-auto">
                <div className="flex items-center gap-2 flex-wrap">
                  {user.organization?.name ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                      <Building3 size={10} />
                      {user.organization.name}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-md text-base-content/30 border border-dashed border-base-content/10">
                      <Building3 size={10} />
                      No org
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-md border ${
                      user.is_active
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-base-200 text-base-content/70"
                    }`}
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </span>

                  {user.is_staff && (
                    <span
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20"
                      title="Staff Member"
                    >
                      <Verify size={12} variant="Bold" />
                      <span className="hidden sm:inline">Staff</span>
                    </span>
                  )}

                  {roleName
                    ? (() => {
                        const RoleIcon = getRoleIcon(roleName);

                        return (
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-md border bg-base-200 text-base-content/70`}
                            title={`Role: ${roleName}`}
                          >
                            {RoleIcon ? (
                              <RoleIcon size={12} variant="Bold" />
                            ) : null}
                            <span>{roleName}</span>
                          </span>
                        );
                      })()
                    : null}
                </div>

                {showActionButtons && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(user)}
                      className="p-1.5 rounded-lg text-base-content/40 hover:text-base-content hover:bg-base-content/10 transition-colors"
                      title="Edit User"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteModalState({ open: true, user })}
                      className="p-1.5 rounded-lg text-base-content/40 hover:text-base-content hover:bg-base-content/10 transition-colors"
                      title="Delete User"
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
        onClose={() => setDeleteModalState({ open: false, user: null })}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete the user "${deleteModalState.user?.username}"? This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
};
