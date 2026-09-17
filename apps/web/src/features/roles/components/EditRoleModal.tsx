// @apps/web/src/features/roles/components/EditRoleModal.tsx
import React from "react";
import { useUpdateRole } from "../hooks/useRoles";
import type { Role, RoleUpdateData } from "../types";
import { RoleFormModal } from "./RoleFormModal";

interface EditRoleModalProps {
  isOpen: boolean;
  role: Role | null;
  onClose: () => void;
}

export const EditRoleModal: React.FC<EditRoleModalProps> = ({
  isOpen,
  role,
  onClose,
}) => {
  const { mutate: updateRole, isPending } = useUpdateRole();

  return (
    <RoleFormModal
      isOpen={isOpen}
      title={role ? `Edit Role "${role.name}"` : "Edit Role"}
      submitLabel="Update Changes"
      initialRole={role}
      isPending={isPending}
      onClose={onClose}
      onSubmit={(data) => {
        if (!role) return;
        updateRole(
          {
            id: role.id,
            data: data as RoleUpdateData,
          },
          {
            onSuccess: () => {
              onClose(); // Close modal after successful update
            },
          }
        );
      }}
    />
  );
};
