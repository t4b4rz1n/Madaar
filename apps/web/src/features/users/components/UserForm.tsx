import { motion } from "framer-motion";
import { Lock, Message, TickSquare, User } from "iconsax-reactjs";
import { Controller } from "react-hook-form";
import InputField from "../../../components/InputField";

interface UserFormProps {
  control: any;
  errors: any;
  editMode?: boolean;
}

export const UserForm = ({ control, errors, editMode }: UserFormProps) => {
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
                  Must be at least 8 characters with uppercase, lowercase, and
                  numbers
                </span>
              )}
            </label>
          )}
        />
      )}

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

      <div className="flex flex-col gap-2 pt-2">
        <Controller
          name="is_active"
          control={control}
          render={({ field }) => (
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                checked={field.value}
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
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
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
