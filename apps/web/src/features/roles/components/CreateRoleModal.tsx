import React from "react";
import { useCreateRole } from "../hooks/useRoles";
import { RoleFormModal } from "./RoleFormModal";
import type { RoleFormData } from "../types";

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateRoleModal: React.FC<CreateRoleModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { mutate: createRole, isPending } = useCreateRole();

  return (
    <RoleFormModal
      isOpen={isOpen}
      title="Create New Role"
      submitLabel="Save Role"
      isPending={isPending}
      onClose={onClose}
      onSubmit={(data) => {
        createRole(data as RoleFormData, {
          onSuccess: () => {
            onClose(); // Close modal after successful submission
          },
        });
      }}
    />
  );
};
