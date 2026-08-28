import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Add, CloseCircle, Hierarchy, Lock, Message, User } from "iconsax-reactjs";
import { createPortal } from "react-dom";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateUser } from "../../users/hooks/useUsers";
import { useRoles } from "../../roles/hooks/useRoles";
import InputField from "../../../components/InputField";
import type { UserFormData } from "../../users/types";

const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 30, scale: 0.98 },
};

const createOrgMemberSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  role_id: z.union([z.string(), z.number()]).nullable().optional(),
});

type OrgMemberFormData = z.infer<typeof createOrgMemberSchema>;

interface CreateOrgMemberModalProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CreateOrgMemberModal = ({
  orgId,
  isOpen,
  onClose,
}: CreateOrgMemberModalProps) => {
  const queryClient = useQueryClient();
  const createMutation = useCreateUser();
  const { data: rolesData, isLoading: isLoadingRoles } = useRoles();
  const roles = rolesData?.results ?? [];

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OrgMemberFormData>({
    resolver: zodResolver(createOrgMemberSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      role_id: null,
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        username: "",
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        role_id: null,
      });
    }
  }, [isOpen, reset]);

  const onSubmit = handleSubmit((data) => {
    const payload: UserFormData = {
      username: data.username,
      email: data.email,
      password: data.password,
      first_name: data.first_name ?? "",
      last_name: data.last_name ?? "",
      is_active: true,
      is_staff: false,
      role_id: data.role_id ?? null,
      organization_id: orgId,
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["organizations"] });
        queryClient.invalidateQueries({ queryKey: ["organizations", orgId] });
        queryClient.invalidateQueries({ queryKey: ["organizations", orgId, "members"] });
        onClose();
      },
    });
  });

  const isLoading = createMutation.isPending;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            className="relative w-full max-w-xl bg-base-100 rounded-2xl shadow-xl m-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 flex-shrink-0 border-b border-base-content/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <Add size={28} />
                  </div>
                  <div>
                    <h3 className="font-bold text-2xl text-base-content">
                      Create Organization Member
                    </h3>
                    <p className="text-base-content/70 text-sm">
                      Add a new user to this organization
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-base-content/10 rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  <CloseCircle className="w-6 h-6 text-base-content/60" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pt-6">
              <form id="org-member-form" onSubmit={onSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Controller
                    name="first_name"
                    control={control}
                    render={({ field }) => (
                      <label className="form-control w-full">
                        <div className="label mb-2">
                          <span className="label-text font-semibold">First Name</span>
                        </div>
                        <InputField
                          {...field}
                          value={field.value ?? ""}
                          placeholder="John"
                          classNameInput={errors.first_name ? "input-error" : ""}
                        />
                        {errors.first_name && (
                          <span className="text-error text-xs mt-1">
                            {errors.first_name.message}
                          </span>
                        )}
                      </label>
                    )}
                  />

                  <Controller
                    name="last_name"
                    control={control}
                    render={({ field }) => (
                      <label className="form-control w-full">
                        <div className="label mb-2">
                          <span className="label-text font-semibold">Last Name</span>
                        </div>
                        <InputField
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Doe"
                          classNameInput={errors.last_name ? "input-error" : ""}
                        />
                        {errors.last_name && (
                          <span className="text-error text-xs mt-1">
                            {errors.last_name.message}
                          </span>
                        )}
                      </label>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Controller
                    name="username"
                    control={control}
                    render={({ field }) => (
                      <label className="form-control w-full">
                        <div className="label mb-2">
                          <span className="label-text font-semibold">
                            Username <span className="text-error">*</span>
                          </span>
                        </div>
                        <InputField
                          {...field}
                          value={field.value ?? ""}
                          placeholder="johndoe"
                          icon={<User size={18} />}
                          classNameInput={errors.username ? "input-error" : ""}
                        />
                        {errors.username && (
                          <span className="text-error text-xs mt-1">
                            {errors.username.message}
                          </span>
                        )}
                      </label>
                    )}
                  />

                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <label className="form-control w-full">
                        <div className="label mb-2">
                          <span className="label-text font-semibold">
                            Email <span className="text-error">*</span>
                          </span>
                        </div>
                        <InputField
                          {...field}
                          value={field.value ?? ""}
                          placeholder="john@example.com"
                          icon={<Message size={18} />}
                          classNameInput={errors.email ? "input-error" : ""}
                        />
                        {errors.email && (
                          <span className="text-error text-xs mt-1">
                            {errors.email.message}
                          </span>
                        )}
                      </label>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <label className="form-control w-full">
                        <div className="label mb-2">
                          <span className="label-text font-semibold">
                            Password <span className="text-error">*</span>
                          </span>
                        </div>
                        <InputField
                          type="password"
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Min. 8 characters"
                          icon={<Lock size={18} />}
                          classNameInput={errors.password ? "input-error" : ""}
                        />
                        {errors.password ? (
                          <span className="text-error text-xs mt-1">
                            {errors.password.message}
                          </span>
                        ) : (
                          <span className="text-xs text-base-content/60 mt-1">
                            At least 8 characters with upper, lower, and numbers
                          </span>
                        )}
                      </label>
                    )}
                  />

                  <Controller
                    name="role_id"
                    control={control}
                    render={({ field }) => (
                      <label className="form-control w-full">
                        <div className="label mb-2">
                          <span className="label-text font-semibold">User Role</span>
                        </div>
                        <div className="relative">
                          <select
                            name={field.name}
                            ref={field.ref}
                            value={field.value ?? ""}
                            onBlur={field.onBlur}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === "" ? null : Number(e.target.value),
                              )
                            }
                            className={`select select-bordered w-full pl-10 ${
                              errors.role_id ? "select-error" : ""
                            }`}
                            disabled={isLoadingRoles}
                          >
                            <option value="">Select a role</option>
                            {roles.map((role) => (
                              <option key={role.id} value={String(role.id)}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 pointer-events-none">
                            <Hierarchy size={18} />
                          </div>
                        </div>
                        {errors.role_id && (
                          <span className="text-error text-xs mt-1">
                            {errors.role_id.message}
                          </span>
                        )}
                      </label>
                    )}
                  />
                </div>
              </form>
            </div>

            <div className="p-6 flex-shrink-0 border-t border-base-content/10 bg-base-200/30 rounded-b-2xl">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-ghost rounded-xl"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="org-member-form"
                  disabled={isLoading}
                  className="btn btn-primary rounded-xl px-6"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="loading loading-spinner loading-sm"></span>
                      Saving...
                    </span>
                  ) : (
                    "Create Member"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
};
