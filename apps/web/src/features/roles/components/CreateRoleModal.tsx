import React from "react";
import { useCreateRole } from "../hooks/useRoles";
import { RoleFormModal } from "./RoleFormModal";
import type { RoleFormData } from "../types";

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** If provided, locks this role to the given organization (org-scoped create) */
  organizationId?: string;
  organizationName?: string;
}

export const CreateRoleModal: React.FC<CreateRoleModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  organizationName,
}) => {
  const { mutate: createRole, isPending } = useCreateRole();

  return (
    <RoleFormModal
      isOpen={isOpen}
      title="Create New Role"
      submitLabel="Save Role"
      isPending={isPending}
      onClose={onClose}
      lockedOrganizationId={organizationId}
      lockedOrganizationName={organizationName}
      showOrgSelector={!organizationId}
      onSubmit={(data) => {
        createRole(data as RoleFormData, {
          onSuccess: () => {
            onClose();
          },
        });
      }}
    />
  );
};
