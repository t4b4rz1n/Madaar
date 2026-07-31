import React, { useEffect, useMemo } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import type { Role, RoleFormData, RoleUpdateData } from "../types";
import { PERMISSIONS_BY_GROUP } from "../constants/permissions";

type RoleFormValues = {
  name: string;
  description: string;
  is_active: boolean;
  is_staff: boolean;
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
  const allPermissionIds = useMemo(
    () =>
      Object.values(PERMISSIONS_BY_GROUP)
        .flat()
        .map((permission) => permission.id),
    [],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RoleFormValues>({
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
      is_staff: false,
      permissions: [],
    },
  });

  const isStaff = watch("is_staff");

  useEffect(() => {
    if (!isOpen) return;

    reset({
      name: initialRole?.name ?? "",
      description: initialRole?.description ?? "",
      is_active: initialRole?.is_active ?? true,
      is_staff: initialRole?.is_staff ?? false,
      permissions:
        initialRole?.is_staff ? allPermissionIds : initialRole?.permissions ?? [],
    });
  }, [allPermissionIds, initialRole, isOpen, reset]);

  useEffect(() => {
    if (isStaff) {
      setValue("permissions", allPermissionIds, {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    if (!initialRole?.is_staff) {
      setValue("permissions", [], {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [allPermissionIds, initialRole?.is_staff, isStaff, setValue]);

  const submitHandler: SubmitHandler<RoleFormValues> = (values) => {
    onSubmit({
      name: values.name,
      description: values.description,
      is_active: values.is_active,
      is_staff: values.is_staff,
      permissions: values.permissions,
    });
  };

  if (!isOpen) return null;

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
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Role Name</span>
              </label>
              <input
                {...register("name", { required: "Role name is required" })}
                className="input input-bordered w-full rounded-2xl"
                placeholder="e.g. Manager"
              />
              {errors.name && (
                <span className="mt-1 text-xs text-error">
                  {errors.name.message}
                </span>
              )}
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Status & Staff</span>
              </label>
              <div className="mt-2 flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    {...register("is_active")}
                    type="checkbox"
                    className="checkbox checkbox-primary checkbox-sm"
                  />
                  <span className="text-sm">Active</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    {...register("is_staff")}
                    type="checkbox"
                    className="checkbox checkbox-secondary checkbox-sm"
                  />
                  <span className="text-sm">Staff</span>
                </label>
              </div>
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

          <div className="space-y-4">
            <h4 className="border-s-4 border-primary ps-2 text-sm font-bold text-base-content/80">
              Manage Permissions
            </h4>

            <div className="grid grid-cols-1 gap-6 rounded-3xl border border-base-300 bg-base-200/30 p-4 md:grid-cols-2">
              {Object.entries(PERMISSIONS_BY_GROUP).map(([group, perms]) => (
                <div key={group} className="space-y-2">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-base-content/40">
                    {group}
                  </p>

                  <div className="flex flex-col gap-2">
                    {perms.map((p) => (
                      <label
                        key={p.id}
                        className={`group flex items-center gap-3 ${
                          isStaff
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          value={p.id}
                          {...register("permissions")}
                          disabled={isStaff}
                          className="checkbox checkbox-primary checkbox-xs"
                        />
                        <span className="text-sm text-base-content/70 transition-colors group-hover:text-primary">
                          {p.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {isStaff && (
              <p className="text-xs text-info">
                Staff roles automatically receive all permissions.
              </p>
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
