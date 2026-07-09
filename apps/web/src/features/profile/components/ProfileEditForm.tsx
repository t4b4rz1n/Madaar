import { motion } from "framer-motion";
import { CloseCircle, Lock, Sms, TickCircle, User } from "iconsax-reactjs";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import InputField from "../../../components/InputField";
import { useAuthStore } from "../../auth/store/authStore";
import { useUpdateProfile } from "../hooks/useProfile";
import type { ProfileUpdateData } from "../types";

export const ProfileEditForm = () => {
  const user = useAuthStore((state) => state.user);
  const updateMutation = useUpdateProfile();

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { isDirty },
  } = useForm<ProfileUpdateData>({
    defaultValues: {
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      password: "",
      password_confirm: "",
    },
  });

  if (!user) {
    return (
      <div className="text-center text-error py-10">
        Error loading profile information.
      </div>
    );
  }

  const password = watch("password");
  const passwordConfirm = watch("password_confirm");

  const onSubmit = (data: ProfileUpdateData) => {
    if (data.password || data.password_confirm) {
      if (data.password !== data.password_confirm) {
        toast.error("Passwords do not match.");
        return;
      }
      if (!data.password || data.password.length < 8) {
        toast.error("Password must be at least 8 characters.");
        return;
      }
    }

    const updateData: ProfileUpdateData = {};

    if (data.first_name !== user.first_name) {
      updateData.first_name = data.first_name;
    }
    if (data.last_name !== user.last_name) {
      updateData.last_name = data.last_name;
    }
    if (data.password && data.password_confirm) {
      updateData.password = data.password;
      updateData.password_confirm = data.password_confirm;
    }

    if (Object.keys(updateData).length === 0) {
      toast.info("No changes to save.");
      return;
    }

    updateMutation.mutate(updateData, {
      onSuccess: () => {
        reset({
          first_name: data.first_name,
          last_name: data.last_name,
          password: "",
          password_confirm: "",
        });
      },
    });
  };

  const currentProfileImage = user.profile_image_url || "/default-avatar.png";

  const passwordsMatch =
    password && passwordConfirm && password === passwordConfirm;
  const passwordsDoNotMatch =
    password && passwordConfirm && password !== passwordConfirm;
  const passwordTooShort =
    password && password.length > 0 && password.length < 8;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-base-100 rounded-2xl border border-base-content/10 overflow-hidden">
          <div className="px-6 py-8 text-center border-b border-base-content/10">
            <div className="flex flex-col items-center gap-4">
              <div className="avatar">
                <div className="w-28 rounded-full ring ring-primary ring-offset-base-100 ring-offset-4">
                  <img src={currentProfileImage} alt="Profile" />
                </div>
              </div>

              <div>
                <h3 className="font-bold text-xl text-base-content">
                  {user.username}
                </h3>
                <p className="text-sm text-base-content/60 mt-1">
                  {user.email}
                </p>
                {user.is_staff && (
                  <div className="mt-3">
                    <span className="badge badge-primary gap-2">
                      <TickCircle size={14} />
                      Staff Member
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-5 bg-primary rounded-full"></div>
                <h3 className="text-sm font-bold text-base-content/70 uppercase tracking-wider">
                  Personal Information
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-base-content">
                      First Name
                    </span>
                    <span className="text-error text-xs">*</span>
                  </label>
                  <Controller
                    name="first_name"
                    control={control}
                    render={({ field }) => (
                      <InputField
                        {...field}
                        value={field.value || ""}
                        placeholder="Enter first name"
                        classNameInput="!shadow-none"
                        icon={<User size={18} />}
                      />
                    )}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-base-content">
                      Last Name
                    </span>
                    <span className="text-error text-xs">*</span>
                  </label>
                  <Controller
                    name="last_name"
                    control={control}
                    render={({ field }) => (
                      <InputField
                        {...field}
                        value={field.value || ""}
                        placeholder="Enter last name"
                        classNameInput="!shadow-none"
                        icon={<User size={18} />}
                      />
                    )}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-base-content/50">
                      Email Address
                    </span>
                    <span className="badge badge-xs bg-base-200 text-base-content/60 border-0">
                      Read Only
                    </span>
                  </label>
                  <InputField
                    name="email"
                    value={user.email}
                    onChange={() => {}}
                    placeholder="Email"
                    classNameInput="!shadow-none !bg-base-200/50 !cursor-not-allowed !text-base-content/60"
                    icon={<Sms size={18} />}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-base-content/50">
                      Username
                    </span>
                    <span className="badge badge-xs bg-base-200 text-base-content/60 border-0">
                      Read Only
                    </span>
                  </label>
                  <InputField
                    name="username"
                    value={user.username}
                    onChange={() => {}}
                    placeholder="Username"
                    classNameInput="!shadow-none !bg-base-200/50 !cursor-not-allowed !text-base-content/60"
                    icon={<User size={18} />}
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-5 bg-warning rounded-full"></div>
                <h3 className="text-sm font-bold text-base-content/70 uppercase tracking-wider">
                  Security & Password
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-base-content">
                      New Password
                    </span>
                  </label>
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <InputField
                        {...field}
                        value={field.value || ""}
                        type="password"
                        placeholder="Enter new password"
                        classNameInput="!shadow-none"
                        icon={<Lock size={18} />}
                      />
                    )}
                  />
                  {passwordTooShort && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-1.5 mt-2 text-warning text-xs"
                    >
                      <CloseCircle className="w-3.5 h-3.5" />
                      Minimum 8 characters required
                    </motion.div>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-base-content">
                      Confirm Password
                    </span>
                  </label>
                  <Controller
                    name="password_confirm"
                    control={control}
                    render={({ field }) => (
                      <InputField
                        {...field}
                        value={field.value || ""}
                        type="password"
                        placeholder="Confirm new password"
                        classNameInput="!shadow-none"
                        icon={<Lock size={18} />}
                      />
                    )}
                  />
                  {passwordsDoNotMatch && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-1.5 mt-2 text-error text-xs"
                    >
                      <CloseCircle className="w-3.5 h-3.5" />
                      Passwords do not match
                    </motion.div>
                  )}
                  {passwordsMatch && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-1.5 mt-2 text-success text-xs"
                    >
                      <TickCircle className="w-3.5 h-3.5" />
                      Passwords match
                    </motion.div>
                  )}
                </div>
              </div>

              {(password || passwordConfirm) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 bg-warning/5 border border-warning/20 rounded-xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-warning/10 rounded-lg flex-shrink-0 mt-0.5">
                      <Lock className="w-4 h-4 text-warning" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-base-content mb-1">
                        Password Security Tip
                      </h4>
                      <p className="text-xs text-base-content/70 leading-relaxed">
                        Use a strong, unique password with at least 8
                        characters. Leave blank to keep your current password.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-base-content/10 bg-base-200/30">
            <div className="flex items-center justify-between">
              <div className="text-sm text-base-content/60">
                {isDirty ? (
                  <span className="flex items-center gap-2 text-warning">
                    <div className="w-2 h-2 bg-warning rounded-full animate-pulse"></div>
                    Unsaved changes
                  </span>
                ) : (
                  <span className="text-base-content/50">No changes</span>
                )}
              </div>
              <button
                type="submit"
                className="btn btn-primary rounded-xl px-8"
                disabled={updateMutation.isPending || !isDirty}
              >
                {updateMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="loading loading-spinner loading-sm"></span>
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <TickCircle className="w-5 h-5" />
                    Save Changes
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
};
