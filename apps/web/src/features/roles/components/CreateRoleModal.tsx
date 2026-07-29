import React from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRole } from "../api/rolesApi";
import type { RoleFormData } from "../types";

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateRoleModal: React.FC<CreateRoleModalProps> = ({
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleFormData>({
    defaultValues: {
      name: "",
      description: "",
      is_active: true,
      is_staff: false,
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      reset();
      onClose();
    },
    onError: (error) => {
      console.error("Server connection error:", error);
      alert("Something went wrong, please try again.");
    },
  });

  const onSubmit: SubmitHandler<RoleFormData> = (data) => {
    createRoleMutation.mutate(data);
  };

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open backdrop-blur-sm">
      <div className="modal-box w-full max-w-xl rounded-3xl border border-base-300/80 bg-base-100 shadow-2xl">
        <div className="flex items-start justify-between border-b border-base-300/70 pb-4">
          <div>
            <h3 className="text-xl font-bold text-base-content">
              Create New Role
            </h3>
            <p className="mt-1 text-xs text-base-content/70 sm:text-sm">
              Add a new role to the system
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-sm hover:bg-base-200/60"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
          <div className="form-control w-full">
            <div className="label">
              <span className="label-text text-sm font-medium">Role Name</span>
            </div>
            <input
              {...register("name", { required: "Role name is required" })}
              type="text"
              className="input input-bordered w-full rounded-2xl"
              placeholder="e.g. Admin"
            />
            {errors.name && (
              <span className="mt-2 text-sm text-error">
                {errors.name.message}
              </span>
            )}
          </div>

          <div className="form-control w-full">
            <div className="label">
              <span className="label-text text-sm font-medium">
                Description
              </span>
            </div>
            <textarea
              {...register("description")}
              className="textarea textarea-bordered min-h-[96px] w-full rounded-2xl"
              placeholder="Role description..."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                {...register("is_active")}
                type="checkbox"
                className="checkbox checkbox-primary"
              />
              <span className="label-text text-sm">Active Role</span>
            </label>

            <label className="label cursor-pointer justify-start gap-3">
              <input
                {...register("is_staff")}
                type="checkbox"
                className="checkbox checkbox-primary"
              />
              <span className="label-text text-sm">Staff Only</span>
            </label>
          </div>

          <div className="modal-action mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost rounded-2xl px-6"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary rounded-2xl px-7 font-semibold"
              disabled={createRoleMutation.isPending}
            >
              {createRoleMutation.isPending ? "Creating..." : "Create Role"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};
