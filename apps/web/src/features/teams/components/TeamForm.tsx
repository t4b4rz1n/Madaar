import { motion } from "framer-motion";
import { TickSquare, TextalignLeft, Profile2User, User } from "iconsax-reactjs";
import { Controller } from "react-hook-form";
import InputField from "../../../components/InputField";
import { useUsers } from "../../users/hooks/useUsers";
import type { User as UserType } from "../../users/types";

interface TeamFormProps {
  control: any;
  errors: any;
  organizationId?: string | null;
}

export const TeamForm = ({ control, errors, organizationId }: TeamFormProps) => {
  const params = new URLSearchParams({ page_size: "1000" });
  if (organizationId) {
    params.append("organization_id", String(organizationId));
  }
  const { data: usersResponse, isLoading: isLoadingUsers } = useUsers(params);
  const users: UserType[] = usersResponse?.results ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 flex flex-col mb-8"
    >
      <Controller
        name="lead_id"
        control={control}
        render={({ field }) => (
          <label className="form-control w-full">
            <div className="label mb-2">
              <span className="label-text font-semibold">Team Leader</span>
            </div>
            <div className="relative">
              <select
                name={field.name}
                ref={field.ref}
                value={field.value ?? ""}
                onBlur={field.onBlur}
                onChange={(e) =>
                  field.onChange(e.target.value === "" ? null : e.target.value)
                }
                className={`select select-bordered w-full rounded-xl pl-10 ${
                  errors.lead_id ? "select-error" : ""
                }`}
                disabled={isLoadingUsers}
              >
                <option value="">Select a team leader...</option>
                {users.map((user) => (
                  <option key={user.id} value={String(user.id)}>
                    {user.first_name} {user.last_name} ({user.username})
                  </option>
                ))}
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 pointer-events-none">
                <User size={18} />
              </div>
            </div>
            {errors.lead_id && (
              <span className="text-error text-xs mt-1">
                {errors.lead_id.message}
              </span>
            )}
          </label>
        )}
      />

      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <label className="form-control w-full">
            <div className="label mb-2">
              <span className="label-text font-semibold">Team Name</span>
            </div>
            <InputField
              {...field}
              placeholder="Enter team name (e.g. Frontend Team)"
              classNameInput={errors.name ? "input-error" : ""}
              icon={<Profile2User size={18} />}
            />
            {errors.name && (
              <span className="text-error text-xs mt-1">
                {errors.name.message}
              </span>
            )}
          </label>
        )}
      />

      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <label className="form-control w-full">
            <div className="label mb-2">
              <span className="label-text font-semibold">Description</span>
            </div>
            <div className="relative">
              <textarea
                {...field}
                placeholder="What does this team do?"
                className={`textarea textarea-bordered w-full pl-10 min-h-[100px] ${
                  errors.description ? "textarea-error" : ""
                }`}
              />
              <div className="absolute left-3 top-3 text-base-content/50 pointer-events-none">
                <TextalignLeft size={18} />
              </div>
            </div>
            {errors.description && (
              <span className="text-error text-xs mt-1">
                {errors.description.message}
              </span>
            )}
          </label>
        )}
      />

      <Controller
        name="is_active"
        control={control}
        render={({ field }) => (
          <label className="label cursor-pointer justify-start gap-3 pt-2">
            <input
              type="checkbox"
              checked={!!field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              className="checkbox checkbox-primary"
            />
            <div className="flex items-center gap-2">
              <TickSquare className="w-5 h-5 text-success" />
              <span className="label-text font-medium">Active Team</span>
            </div>
          </label>
        )}
      />
    </motion.div>
  );
};
