import { useTranslation } from "../../../i18n/locale";
import { CustomDatePicker } from "../../../components/CustomDatePicker";
import { Controller } from "react-hook-form";
import { motion } from "motion/react";
import InputField from "../../../components/InputField";

interface DiscountFormProps {
  control: any;
  errors: any;
  editMode?: boolean;
}

export const DiscountForm = ({
  control,
  errors,
}: DiscountFormProps) => {
  const t = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 flex flex-col mb-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Controller
          name="code"
          control={control}
          render={({ field }) => (
            <label className="form-control w-full">
              <div className="label mb-2">
                <span className="label-text font-semibold">{t("Discount Code")}</span>
              </div>
              <InputField
                {...field}
                placeholder={t("e.g., SUMMER2024")}
                classNameInput={errors.code ? "input-error" : ""}
              />
              {errors.code && (
                <span className="text-error text-xs mt-1">
                  {errors.code.message}
                </span>
              )}
            </label>
          )}
        />

        <Controller
          name="percent"
          control={control}
          render={({ field }) => (
            <label className="form-control w-full">
              <div className="label mb-2">
                <span className="label-text font-semibold">
                  {t("Discount Percent")}</span>
              </div>
              <InputField
                type="number"
                {...field}
                placeholder={t("e.g., 20")}
                classNameInput={errors.percent ? "input-error" : ""}
              />
              {errors.percent && (
                <span className="text-error text-xs mt-1">
                  {errors.percent.message}
                </span>
              )}
            </label>
          )}
        />
      </div>

      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <label className="form-control w-full">
            <div className="label mb-2">
              <span className="label-text font-semibold">{t("توضیح")}</span>
            </div>
            <textarea
              {...field}
              placeholder={t("Enter discount description")}
              className={`textarea textarea-bordered w-full h-24 resize-none ${
                errors.description ? "textarea-error" : ""
              }`}
            />
            {errors.description && (
              <span className="text-error text-xs mt-1">
                {errors.description.message}
              </span>
            )}
          </label>
        )}
      />

      <Controller
        name="max_usage"
        control={control}
        render={({ field }) => (
          <label className="form-control w-full">
            <div className="label mb-2">
              <span className="label-text font-semibold">{t("Maximum Usage")}</span>
            </div>
            <InputField
              type="number"
              {...field}
              placeholder={t("e.g., 100")}
              classNameInput={errors.max_usage ? "input-error" : ""}
            />
            {errors.max_usage && (
              <span className="text-error text-xs mt-1">
                {errors.max_usage.message}
              </span>
            )}
          </label>
        )}
      />

      <Controller
        name="expiration_date"
        control={control}
        render={({ field }) => (
          <label className="form-control w-full">
            <div className="label mb-2">
              <span className="label-text font-semibold">{t("Expiration Date")}</span>
            </div>
            <CustomDatePicker
              value={field.value}
              onChange={(value) => field.onChange(value)}
              placeholder={t("Select expiration date")}
              error={errors.expiration_date?.message}
            />
          </label>
        )}
      />

      <Controller
        name="is_active"
        control={control}
        render={({ field }) => (
          <label className="form-control w-full">
            <div className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="checkbox checkbox-primary"
              />
              <span className="label-text font-semibold">{t("فعال")}</span>
            </div>
          </label>
        )}
      />
    </motion.div>
  );
};
