import React, { useEffect, useMemo, useRef } from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import type { Permission, Role, RoleFormData, RoleUpdateData } from "../types";
import { usePermissions } from "../hooks/useRoles";

type RoleFormValues = {
  name: string;
  description: string;
  permissions: string[];
};

type RoleFormModalProps = {
  isOpen: boolean;
  title: string;
  submitLabel: string;
  initialRole?: Role | null;
  isPending?: boolean;
  onClose: () => void;
  onSubmit: (data: RoleFormData | RoleUpdateData) => void;
};

export const RoleFormModal: React.FC<RoleFormModalProps> = ({
  isOpen,
  title,
  submitLabel,
  initialRole,
  isPending = false,
  onClose,
  onSubmit,
}) => {
  // Load permissions dynamically from the backend
  const { data: permissionsData, isLoading: isLoadingPerms } = usePermissions();

  const allPermissionIds = useMemo(
    () => (permissionsData?.permissions || []).map((p: Permission) => p.code),
    [permissionsData],
  );

  // Group permissions by module for display
  const permissionsByModule = useMemo(() => {
    if (!permissionsData?.permissions) return {};
    return (permissionsData.permissions as Permission[]).reduce(
      (acc: Record<string, Permission[]>, perm: Permission) => {
        if (!acc[perm.module]) acc[perm.module] = [];
        acc[perm.module].push(perm);
        return acc;
      },
      {} as Record<string, Permission[]>,
    );
  }, [permissionsData]);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<RoleFormValues>({
    defaultValues: {
      name: "",
      description: "",
      permissions: [],
    },
  });

  const watchedPermissions = useWatch({
    control,
    name: "permissions",
    defaultValue: [],
  });

  const isFirstRender = useRef(true);

  // Load initial data when modal opens
  useEffect(() => {
    if (!isOpen) {
      isFirstRender.current = true;
      return;
    }

    reset({
      name: initialRole?.name ?? "",
      description: initialRole?.description ?? "",
      permissions: initialRole?.permissions ?? [],
    });

    setTimeout(() => {
      isFirstRender.current = false;
    }, 0);
  }, [initialRole, isOpen, reset]);

  const submitHandler: SubmitHandler<RoleFormValues> = (values) => {
    onSubmit({
      name: values.name,
      description: values.description,
      permissions: values.permissions,
    });
  };

  const handleSelectAll = () => {
    const current = (watchedPermissions as string[]) || [];
    const allSelected =
      allPermissionIds.length > 0 &&
      allPermissionIds.every((id: string) => current.includes(id));
    setValue("permissions", allSelected ? [] : allPermissionIds, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };


  if (!isOpen) return null;

  const selectedCount = (watchedPermissions as string[]).length;
  const totalCount = allPermissionIds.length;
  const allSelected = totalCount > 0 && selectedCount === totalCount;

  return (
    <dialog className="modal modal-open backdrop-blur-sm">
      <div className="modal-box w-full max-w-2xl rounded-3xl border border-base-300/80 bg-base-100 shadow-2xl">
        <div className="flex items-start justify-between border-b border-base-300/70 pb-4">
          <div>
            <h3 className="text-xl font-bold text-base-content">{title}</h3>
            <p className="mt-1 text-xs text-base-content/70 sm:text-sm">
              Manage role details and permissions
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-sm"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(submitHandler)} className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="form-control w-full sm:col-span-2">
              <label className="label">
                <span className="label-text font-medium">Role Name</span>
              </label>
              <input
                {...register("name", { required: "Role name is required" })}
                className="input input-bordered w-full rounded-2xl"
                placeholder="e.g. Quality Reviewer"
              />
              {errors.name && (
                <span className="mt-1 text-xs text-error">
                  {errors.name.message}
                </span>
              )}
            </div>
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-medium">Description</span>
            </label>
            <textarea
              {...register("description")}
              className="textarea textarea-bordered h-20 rounded-2xl"
              placeholder="Short description..."
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="border-s-4 border-primary ps-2 text-sm font-bold text-base-content/80">
                Permissions
                {totalCount > 0 && (
                  <span className="ms-2 text-xs font-normal text-base-content/50">
                    ({selectedCount}/{totalCount} selected)
                  </span>
                )}
              </h4>
              {totalCount > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="btn btn-xs btn-ghost text-primary"
                >
                  {allSelected ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>

            {isLoadingPerms ? (
              <div className="flex items-center justify-center py-8">
                <span className="loading loading-spinner loading-sm text-primary" />
                <span className="ms-2 text-sm text-base-content/50">Loading permissions...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 rounded-3xl border border-base-300 bg-base-200/30 p-4 md:grid-cols-2">
                {Object.entries(permissionsByModule).map(([module, perms]: [string, Permission[]]) => (
                  <div key={module} className="space-y-2">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-base-content/40">
                      {module}
                    </p>
                    <div className="flex flex-col gap-2">
                      {perms.map((p: Permission) => (
                        <label
                          key={p.code}
                          className="group flex cursor-pointer items-center gap-3"
                        >
                          <input
                            type="checkbox"
                            value={p.code}
                            {...register("permissions")}
                            className="checkbox checkbox-primary checkbox-xs"
                          />
                          <span className="text-sm text-base-content/70 transition-colors group-hover:text-primary">
                            {p.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {Object.keys(permissionsByModule).length === 0 && (
                  <div className="col-span-2 py-6 text-center text-sm text-base-content/40">
                    No permissions found in database.
                    Run <code className="text-xs">migrate_roles_phase3.py</code> to seed them.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-action mt-8">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost rounded-2xl px-6"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary rounded-2xl px-8 shadow-lg shadow-primary/20"
              disabled={isPending}
            >
              {isPending ? "Saving..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};
