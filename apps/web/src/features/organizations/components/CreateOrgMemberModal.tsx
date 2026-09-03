import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Add,
  CloseCircle,
  Hierarchy,
  Lock,
  Message,
  User,
  AddCircle,
  ArrowDown2,
} from "iconsax-reactjs";
import { createPortal } from "react-dom";
import { z } from "zod";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCreateUser, useUnassignedUsers } from "../../users/hooks/useUsers";
import { useRoles } from "../../roles/hooks/useRoles";
import { addExistingMember } from "../api/organizationsApi";
import InputField from "../../../components/InputField";
import type { UserFormData } from "../../users/types";
import type { User as UserType } from "../../users/types";



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
  role_id: z.string().nullable().optional(),
});

type OrgMemberFormData = z.infer<typeof createOrgMemberSchema>;

interface CreateOrgMemberModalProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
}

type MemberTab = "add_existing" | "create_new";

export const CreateOrgMemberModal = ({
  orgId,
  isOpen,
  onClose,
}: CreateOrgMemberModalProps) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<MemberTab>("add_existing");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const createMutation = useCreateUser();
  const {
    data: unassignedUsers = [],
    isLoading: isLoadingUsers,
  } = useUnassignedUsers();
  const { data: rolesData, isLoading: isLoadingRoles } = useRoles(
    orgId ? { organization_id: orgId } : undefined,
  );
  const roles = rolesData?.results ?? [];

  const addExistingMutation = useMutation({
    mutationFn: (data: { user_id: string; role_id?: string | null }) =>
      addExistingMember(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-members", orgId] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["organizations", orgId] });
      queryClient.invalidateQueries({ queryKey: ["users", "unassigned"] });
      toast.success("Member added successfully");
      handleClose();
    },
    onError: (error: any) => {
      if (error?.response?.status === 409) {
        toast.error("User is already a member of this organization");
        return;
      }
      toast.error(error?.response?.data?.message || "Failed to add member");
    },
  });

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

  const resetForm = () => {
    reset({
      username: "",
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      role_id: null,
    });
    setSelectedUserId("");
    setSelectedRoleId("");
    setUserSearch("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTabChange = (tab: MemberTab) => {
    setActiveTab(tab);
    resetForm();
  };

  const filteredUsers = unassignedUsers.filter((u: UserType) => {
    const query = userSearch.toLowerCase();
    return (
      u.username.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.first_name.toLowerCase().includes(query) ||
      u.last_name.toLowerCase().includes(query)
    );
  });

  const selectedUser = unassignedUsers.find(
    (u: UserType) => String(u.id) === selectedUserId,
  );

  const handleAddExistingSubmit = () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }
    addExistingMutation.mutate({
      user_id: selectedUserId,
      role_id: selectedRoleId || undefined,
    });
  };

  const onSubmit = handleSubmit((data) => {
    const payload: UserFormData = {
      username: data.username,
      email: data.email,
      password: data.password,
      first_name: data.first_name ?? "",
      last_name: data.last_name ?? "",
      is_active: true,
      is_staff: false,
      role_id: data.role_id ? String(data.role_id) : null,
      organization_id: orgId,
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["organizations"] });
        queryClient.invalidateQueries({ queryKey: ["organizations", orgId] });
        queryClient.invalidateQueries({ queryKey: ["organization-members", orgId] });
        handleClose();
      },
    });
  });

  const isLoading = createMutation.isPending || addExistingMutation.isPending;

  const tabs: { key: MemberTab; label: string; icon: typeof User }[] = [
    { key: "add_existing", label: "Add Existing User", icon: User },
    { key: "create_new", label: "Create New User", icon: AddCircle },
  ];

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-md sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <motion.div
            variants={modalVariants}
            className="madaar-surface relative m-0 flex max-h-[min(90vh,48rem)] w-full max-w-xl flex-col overflow-hidden rounded-[24px] border border-base-content/10 bg-base-100/95 shadow-madaar-floating backdrop-blur-xl sm:m-4"
          >
            {/* Header */}
            <div className="flex-shrink-0 border-b border-base-content/10 bg-base-200/20 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <Add size={28} />
                  </div>
                  <div>
                    <h3 className="font-bold text-2xl text-base-content">
                      Add Organization Member
                    </h3>
                    <p className="text-base-content/70 text-sm">
                      Add a user to this organization
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                    className="btn btn-ghost btn-square btn-sm rounded-xl text-base-content/50 hover:bg-base-200 hover:text-base-content"
                  disabled={isLoading}
                >
                  <CloseCircle className="w-6 h-6 text-base-content/60" />
                </button>
              </div>

              {/* Segmented Tabs */}
              <div className="mt-5 flex flex-col gap-1 rounded-xl bg-base-200/60 p-1 backdrop-blur-xl sm:flex-row">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => handleTabChange(tab.key)}
                      disabled={isLoading}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-base-100 text-base-content shadow-sm backdrop-blur-xl"
                          : "text-base-content/50 hover:text-base-content/80"
                      }`}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 pt-5 sm:px-6 sm:pt-6">
              {/* --- Add Existing User Tab --- */}
              {activeTab === "add_existing" && (
                <div className="space-y-5">
                  {/* User Select */}
                  <div className="form-control w-full">
                    <div className="label mb-2">
                      <span className="label-text font-semibold">
                        Select User <span className="text-error">*</span>
                      </span>
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          !isLoadingUsers && setIsUserDropdownOpen(!isUserDropdownOpen)
                        }
                        className="input input-bordered flex w-full items-center justify-between rounded-xl px-4 py-3 text-left"
                        disabled={isLoadingUsers}
                      >
                        {isLoadingUsers ? (
                          <span className="text-base-content/50">Loading users...</span>
                        ) : selectedUser ? (
                          <span className="flex items-center gap-2">
                            <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {(
                                selectedUser.first_name?.[0] ||
                                selectedUser.username[0]
                              ).toUpperCase()}
                            </span>
                            <span>
                              {selectedUser.first_name || selectedUser.username}
                              {selectedUser.last_name
                                ? ` ${selectedUser.last_name}`
                                : ""}
                              <span className="ml-1.5 text-xs text-base-content/45">
                                ({selectedUser.email})
                              </span>
                            </span>
                          </span>
                        ) : (
                          <span className="text-base-content/50">
                            Choose an unassigned user
                          </span>
                        )}
                        <ArrowDown2
                          size={16}
                          className={`text-base-content/40 transition-transform ${
                            isUserDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isUserDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-base-content/10 bg-base-100 shadow-xl backdrop-blur-xl">
                          <div className="border-b border-base-content/10 p-2">
                            <input
                              type="text"
                              value={userSearch}
                              onChange={(e) => setUserSearch(e.target.value)}
                              placeholder="Search users..."
                              className="input input-sm input-bordered w-full rounded-lg"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredUsers.length === 0 ? (
                              <div className="px-4 py-8 text-center text-sm text-base-content/45">
                                {userSearch
                                  ? "No matching users found"
                                  : "No unassigned users available"}
                              </div>
                            ) : (
                              filteredUsers.map((u: UserType) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedUserId(String(u.id));
                                    setIsUserDropdownOpen(false);
                                    setUserSearch("");
                                  }}
                                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-base-200/60 ${
                                    String(u.id) === selectedUserId
                                      ? "bg-primary/5 text-primary"
                                      : ""
                                  }`}
                                >
                                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-base-200 text-xs font-bold text-base-content/60">
                                    {(
                                      u.first_name?.[0] || u.username[0]
                                    ).toUpperCase()}
                                  </span>
                                  <span className="min-w-0">
                                    <p className="truncate font-medium">
                                      {u.first_name || u.username}
                                      {u.last_name ? ` ${u.last_name}` : ""}
                                    </p>
                                    <p className="truncate text-xs text-base-content/45">
                                      {u.email}
                                    </p>
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {!isLoadingUsers && unassignedUsers.length === 0 && (
                      <p className="mt-2 text-xs text-base-content/45">
                        All users are already assigned to an organization.
                      </p>
                    )}
                  </div>

                  {/* Role Select */}
                  <div className="form-control w-full">
                    <div className="label mb-2">
                      <span className="label-text font-semibold">
                        Role
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        value={selectedRoleId}
                        onChange={(e) => setSelectedRoleId(e.target.value)}
                        className="select select-bordered w-full rounded-xl pl-10"
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
                  </div>
                </div>
              )}

              {/* --- Create New User Tab --- */}
              {activeTab === "create_new" && (
                <form id="org-member-form" onSubmit={onSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                      name="first_name"
                      control={control}
                      render={({ field }) => (
                        <div className="form-control w-full">
                          <label className="label mb-2">
                            <span className="label-text font-semibold">First Name</span>
                          </label>
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
                        </div>
                      )}
                    />

                    <Controller
                      name="last_name"
                      control={control}
                      render={({ field }) => (
                        <div className="form-control w-full">
                          <label className="label mb-2">
                            <span className="label-text font-semibold">Last Name</span>
                          </label>
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
                        </div>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Controller
                      name="username"
                      control={control}
                      render={({ field }) => (
                        <div className="form-control w-full">
                          <label className="label mb-2">
                            <span className="label-text font-semibold">
                              Username <span className="text-error">*</span>
                            </span>
                          </label>
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
                        </div>
                      )}
                    />

                    <Controller
                      name="email"
                      control={control}
                      render={({ field }) => (
                        <div className="form-control w-full">
                          <label className="label mb-2">
                            <span className="label-text font-semibold">
                              Email <span className="text-error">*</span>
                            </span>
                          </label>
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
                        </div>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Controller
                      name="password"
                      control={control}
                      render={({ field }) => (
                        <div className="form-control w-full">
                          <label className="label mb-2">
                            <span className="label-text font-semibold">
                              Password <span className="text-error">*</span>
                            </span>
                          </label>
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
                        </div>
                      )}
                    />

                    <Controller
                      name="role_id"
                      control={control}
                      render={({ field }) => (
                        <div className="form-control w-full">
                          <label className="label mb-2" htmlFor="create-org-member-role">
                            <span className="label-text font-semibold">User Role</span>
                          </label>
                          <div className="relative">
                            <select
                              id="create-org-member-role"
                              name={field.name}
                              ref={field.ref}
                              value={field.value ?? ""}
                              onBlur={field.onBlur}
                              onChange={(e) => {
                                const val = e.target.value;
                                field.onChange(val === "" ? null : val);
                              }}
                              className={`select select-bordered w-full rounded-xl pl-10 ${
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
                        </div>
                      )}
                    />
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-base-content/10 bg-base-200/30 p-5 sm:p-6">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn btn-ghost rounded-xl"
                  disabled={isLoading}
                >
                  Cancel
                </button>

                {activeTab === "add_existing" ? (
                  <button
                    type="button"
                    onClick={handleAddExistingSubmit}
                    disabled={isLoading || !selectedUserId || addExistingMutation.isPending}
                    className="btn btn-primary rounded-xl px-6"
                  >
                    {addExistingMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <span className="loading loading-spinner loading-sm"></span>
                        Adding...
                      </span>
                    ) : (
                      "Add Member"
                    )}
                  </button>
                ) : (
                  <button
                    type="submit"
                    form="org-member-form"
                    disabled={isLoading}
                    className="btn btn-primary rounded-xl px-6"
                  >
                    {createMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <span className="loading loading-spinner loading-sm"></span>
                        Saving...
                      </span>
                    ) : (
                      "Create Member"
                    )}
                  </button>
                )}
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
