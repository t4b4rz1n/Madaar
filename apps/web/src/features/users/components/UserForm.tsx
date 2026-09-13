import { motion } from "framer-motion";
import { Lock, Message, TickSquare, User, Hierarchy, CardCoin, Coin1 } from "iconsax-reactjs";
import { Controller, useWatch } from "react-hook-form";
import InputField from "../../../components/InputField";
import { useAuthStore } from "../../auth/store/authStore";
import { useRoles } from "../../roles/hooks/useRoles";

interface UserFormProps {
  control: any;
  errors: any;
  setValue: any;
  editMode?: boolean;
  organizationId?: string;
}

export const UserForm = ({
  control,
  errors,
  setValue: _setValue,
  editMode,
  organizationId,
}: UserFormProps) => {
  const { data: rolesData, isLoading: isLoadingRoles } =
    useRoles(organizationId ? { organization_id: organizationId } : undefined);
  const roles = rolesData?.results || [];

  const currentUser = useAuthStore((state) => state.user) as any;
  const canEditStaff = !!currentUser?.is_staff;
  
  const roleNameStr = (currentUser?.role_name || currentUser?.role?.name || "").toLowerCase();
  
  // Watch salary_type reactively — if backend returned a value, it won't be null after reset()
  const watchedSalaryType = useWatch({ control, name: "salary_type" });
  // canEditSalary: true if admin/staff/owner, OR if the backend already returned a salary value
  // (backend only sends salary fields to users who have permission to see them)
  const canEditSalary = canEditStaff || roleNameStr === "owner" || roleNameStr === "admin" || watchedSalaryType != null;


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 flex flex-col mb-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Controller
          name="username"
          control={control}
          render={({ field }) => (
            <label className="form-control w-full">
              <div className="label mb-2">
                <span className="label-text font-semibold">Username</span>
              </div>
              <InputField
                {...field}
                placeholder="Enter username"
                classNameInput={errors.username ? "input-error" : ""}
                icon={<User size={18} />}
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
                <span className="label-text font-semibold">Email</span>
              </div>
              <InputField
                {...field}
                placeholder="Enter email address"
                classNameInput={errors.email ? "input-error" : ""}
                icon={<Message size={18} />}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!editMode && (
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <label className="form-control w-full">
                <div className="label mb-2">
                  <span className="label-text font-semibold">Password</span>
                </div>
                <InputField
                  type="password"
                  {...field}
                  placeholder="Enter password"
                  classNameInput={errors.password ? "input-error" : ""}
                  icon={<Lock size={18} />}
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
        )}

        <Controller
          name="role_id"
          control={control}
          render={({ field }) => (
            <div className="form-control w-full">
              <label className="label mb-2" htmlFor="user-form-role">
                <span className="label-text font-semibold">User Role</span>
              </label>

              <div className="relative">
                <select
                  id="user-form-role"
                  name={field.name}
                  ref={field.ref}
                  value={field.value ?? ""}
                  onBlur={field.onBlur}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? null : e.target.value,
                    )
                  }
                  className={`select select-bordered w-full pl-10 ${
                    errors.role_id ? "select-error" : ""
                  }`}
                  disabled={isLoadingRoles}
                >
                  <option value="">Select a role</option>
                  {roles.map((role: any) => (
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Controller
          name="first_name"
          control={control}
          render={({ field }) => (
            <label className="form-control w-full">
              <div className="label mb-2">
                <span className="label-text font-semibold">First Name</span>
                <span className="text-xs text-base-content/40">(Optional)</span>
              </div>
              <InputField
                {...field}
                placeholder="Enter first name"
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
                <span className="text-xs text-base-content/40">(Optional)</span>
              </div>
              <InputField
                {...field}
                placeholder="Enter last name"
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

      {canEditSalary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="salary_type"
            control={control}
            render={({ field }) => (
              <div className="form-control w-full">
                <label className="label mb-2" htmlFor="user-form-salary-type">
                  <span className="label-text font-semibold">Salary Type</span>
                </label>

                <div className="relative">
                  <select
                    id="user-form-salary-type"
                    name={field.name}
                    ref={field.ref}
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? null : e.target.value,
                      )
                    }
                    className={`select select-bordered w-full pl-10 ${
                      errors.salary_type ? "select-error" : ""
                    }`}
                  >
                    <option value="">No Salary</option>
                    <option value="monthly">Monthly</option>
                    <option value="hourly">Hourly</option>
                  </select>

                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 pointer-events-none">
                    <CardCoin size={18} />
                  </div>
                </div>

                {errors.salary_type && (
                  <span className="text-error text-xs mt-1">
                    {errors.salary_type.message}
                  </span>
                )}
              </div>
            )}
          />

          <Controller
            name="salary_amount"
            control={control}
            render={({ field }) => (
              <label className="form-control w-full">
                <div className="label mb-2">
                  <span className="label-text font-semibold">Salary Amount</span>
                  <span className="text-xs text-base-content/40">(Optional)</span>
                </div>
                <InputField
                  {...field}
                  value={
                    field.value
                      ? Number(field.value.toString().replace(/,/g, "")).toLocaleString("en-US")
                      : ""
                  }
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/,/g, "");
                    // Allow empty or valid numbers, up to 12 digits
                    if (rawValue === "" || (!isNaN(Number(rawValue)) && rawValue.length <= 12)) {
                      field.onChange(rawValue);
                    }
                  }}
                  placeholder="e.g. 12,000,000"
                  type="text"
                  classNameInput={errors.salary_amount ? "input-error" : ""}
                  icon={<Coin1 size={18} />}
                />
                {errors.salary_amount && (
                  <span className="text-error text-xs mt-1">
                    {errors.salary_amount.message}
                  </span>
                )}
              </label>
            )}
          />
        </div>
      )}

      <div className="flex flex-col gap-2 pt-2">
        <Controller
          name="is_active"
          control={control}
          render={({ field }) => (
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                checked={!!field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="checkbox checkbox-primary"
              />
              <div className="flex items-center gap-2">
                <TickSquare className="w-5 h-5 text-success" />
                <span className="label-text font-medium">Active User</span>
              </div>
            </label>
          )}
        />

        <Controller
          name="is_staff"
          control={control}
          render={({ field }) => (
            <label
              className={`label justify-start gap-3 ${
                canEditStaff
                  ? "cursor-pointer"
                  : "cursor-not-allowed opacity-50"
              }`}
            >
              <input
                type="checkbox"
                checked={!!field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                disabled={!canEditStaff}
                className="checkbox checkbox-primary"
              />
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <span className="label-text font-medium">Staff Member</span>
              </div>
            </label>
          )}
        />
      </div>
    </motion.div>
  );
};
