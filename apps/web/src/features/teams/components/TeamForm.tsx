import { motion } from "framer-motion";
import { TickSquare, TextalignLeft, Profile2User } from "iconsax-reactjs";
import { Controller } from "react-hook-form";
import InputField from "../../../components/InputField";

interface TeamFormProps {
  control: any;
  errors: any;
}

export const TeamForm = ({ control, errors }: TeamFormProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 flex flex-col mb-8"
    >
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
