import { motion } from "framer-motion";
import { Camera, CloseCircle, Lock, Sms, TickCircle, User } from "iconsax-reactjs";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import InputField from "../../../components/InputField";
import { useAuthStore } from "../../auth/store/authStore";
import { useUpdateProfile, useTelegramMagicLink, useProfileQuery } from "../hooks/useProfile";
import type { ProfileUpdateData } from "../types";

export const ProfileEditForm = () => {
  const [isWaitingForTelegram, setIsWaitingForTelegram] = useState(false);
  const user = useAuthStore((state) => state.user);

  // Timeout for waiting state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isWaitingForTelegram && !user?.telegram_connected) {
      timeoutId = setTimeout(() => {
        setIsWaitingForTelegram(false);
        toast.info("Telegram connection timed out. Please try again.");
      }, 60000); // 1 minute
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isWaitingForTelegram, user?.telegram_connected]);

  // Only poll if we are waiting and the user is NOT connected yet
  const shouldPoll = isWaitingForTelegram && !user?.telegram_connected;
  useProfileQuery(shouldPoll ? 3000 : false);

  const updateMutation = useUpdateProfile();
  const telegramMutation = useTelegramMagicLink();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { isDirty },
  } = useForm<ProfileUpdateData>({
    values: {
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      password: "",
      password_confirm: "",
      notify_via_email: user?.notify_via_email ?? true,
      notify_via_telegram: user?.notify_via_telegram ?? false,
      calendar_preference: user?.calendar_preference || "gregorian",
    },
  });

  useEffect(() => {
    return () => {
      if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
    };
  }, [profileImagePreview]);

  if (!user) {
    return (
      <div className="text-center text-error py-10">
        Error loading profile information.
      </div>
    );
  }

  const password = watch("password");
  const passwordConfirm = watch("password_confirm");

  const handleProfileImageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG and PNG images are supported.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile image must be smaller than 5 MB.");
      return;
    }

    setProfileImage(file);
    setProfileImagePreview(URL.createObjectURL(file));
  };

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
    if (data.notify_via_email !== user.notify_via_email) {
      updateData.notify_via_email = data.notify_via_email;
    }
    if (data.notify_via_telegram !== user.notify_via_telegram) {
      updateData.notify_via_telegram = data.notify_via_telegram;
    }
    if (data.calendar_preference !== user.calendar_preference) {
      updateData.calendar_preference = data.calendar_preference;
    }
    if (profileImage) {
      updateData.avatar = profileImage;
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
          notify_via_email: data.notify_via_email,
          notify_via_telegram: data.notify_via_telegram,
          calendar_preference: data.calendar_preference,
        });
        setProfileImage(null);
        setProfileImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    });
  };

  const currentProfileImage =
    profileImagePreview || user.profile_image_url || "/images/base-logo2.png";

  const passwordsMatch =
    password && passwordConfirm && password === passwordConfirm;
  const passwordsDoNotMatch =
    password && passwordConfirm && password !== passwordConfirm;
  const passwordTooShort =
    password && password.length > 0 && password.length < 8;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 pb-24">
      {/* Profile Photo Section */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 pb-10 border-b border-base-content/10">
        <div className="w-full lg:w-1/3">
          <h3 className="font-bold text-lg text-base-content">Profile Picture</h3>
          <p className="text-sm font-medium text-base-content/50 mt-2">Update your avatar. Recommended size is 256x256px.</p>
        </div>
        <div className="w-full lg:w-2/3">
          <div className="bg-base-100/50 backdrop-blur-sm rounded-3xl border border-base-content/5 p-8 shadow-sm flex flex-col sm:flex-row items-center gap-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 flex-shrink-0"
              aria-label="Change profile image"
            >
              <span className="avatar">
                <span className="w-32 rounded-full ring-4 ring-primary/20 ring-offset-base-100 ring-offset-4 overflow-hidden shadow-lg">
                  <img
                    src={currentProfileImage}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                </span>
              </span>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-neutral/60 text-neutral-content opacity-0 transition-all duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                <span className="flex flex-col items-center gap-1 text-xs font-semibold">
                  <Camera size={24} />
                  Change photo
                </span>
              </span>
              <span className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border-4 border-base-100 bg-primary text-primary-content shadow-md">
                <Camera size={20} />
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleProfileImageChange}
              className="hidden"
            />
            <div className="text-center sm:text-left flex-1">
              <h3 className="font-black text-2xl text-base-content">{user.username}</h3>
              <p className="text-sm font-semibold text-base-content/50 mt-1">{user.email}</p>
              {user.is_staff && (
                <div className="mt-4">
                  <span className="badge badge-primary badge-lg gap-2 font-bold px-4">
                    <TickCircle size={16} />
                    Staff Member
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information Section */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 pb-10 border-b border-base-content/10">
        <div className="w-full lg:w-1/3">
          <h3 className="font-bold text-lg text-base-content">Personal Details</h3>
          <p className="text-sm font-medium text-base-content/50 mt-2">Manage your personal information and contact details.</p>
        </div>
        <div className="w-full lg:w-2/3">
          <div className="bg-base-100/50 backdrop-blur-sm rounded-3xl border border-base-content/5 p-8 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-base-content/80">First Name</span>
                  <span className="text-[10px] uppercase font-bold text-base-content/40 bg-base-200 px-2 py-0.5 rounded-full">Optional</span>
                </label>
                <Controller
                  name="first_name"
                  control={control}
                  render={({ field }) => (
                    <InputField
                      {...field}
                      value={field.value || ""}
                      placeholder="Enter first name"
                      classNameInput="!bg-base-100 !border-base-content/10 focus:!border-primary"
                      icon={<User size={18} />}
                    />
                  )}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-base-content/80">Last Name</span>
                  <span className="text-[10px] uppercase font-bold text-base-content/40 bg-base-200 px-2 py-0.5 rounded-full">Optional</span>
                </label>
                <Controller
                  name="last_name"
                  control={control}
                  render={({ field }) => (
                    <InputField
                      {...field}
                      value={field.value || ""}
                      placeholder="Enter last name"
                      classNameInput="!bg-base-100 !border-base-content/10 focus:!border-primary"
                      icon={<User size={18} />}
                    />
                  )}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-base-content/50">Email Address</span>
                  <span className="text-[10px] uppercase font-bold text-base-content/40 bg-base-200 px-2 py-0.5 rounded-full">Read Only</span>
                </label>
                <InputField
                  name="email"
                  value={user.email}
                  onChange={() => {}}
                  placeholder="Email"
                  classNameInput="!bg-base-200/40 !border-transparent !cursor-not-allowed !text-base-content/50"
                  icon={<Sms size={18} />}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-base-content/50">Username</span>
                  <span className="text-[10px] uppercase font-bold text-base-content/40 bg-base-200 px-2 py-0.5 rounded-full">Read Only</span>
                </label>
                <InputField
                  name="username"
                  value={user.username}
                  onChange={() => {}}
                  placeholder="Username"
                  classNameInput="!bg-base-200/40 !border-transparent !cursor-not-allowed !text-base-content/50"
                  icon={<User size={18} />}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Password Section */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 pb-10 border-b border-base-content/10">
        <div className="w-full lg:w-1/3">
          <h3 className="font-bold text-lg text-base-content">Security</h3>
          <p className="text-sm font-medium text-base-content/50 mt-2">Update your password to keep your account secure.</p>
        </div>
        <div className="w-full lg:w-2/3">
          <div className="bg-base-100/50 backdrop-blur-sm rounded-3xl border border-base-content/5 p-8 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-base-content/80">New Password</span>
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
                      classNameInput="!bg-base-100 !border-base-content/10 focus:!border-primary"
                      icon={<Lock size={18} />}
                    />
                  )}
                />
                {passwordTooShort && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 mt-2 text-warning font-semibold text-[11px] uppercase tracking-wider">
                    <CloseCircle size={14} /> Minimum 8 characters required
                  </motion.div>
                )}
              </div>
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-base-content/80">Confirm Password</span>
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
                      classNameInput="!bg-base-100 !border-base-content/10 focus:!border-primary"
                      icon={<Lock size={18} />}
                    />
                  )}
                />
                {passwordsDoNotMatch && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 mt-2 text-error font-semibold text-[11px] uppercase tracking-wider">
                    <CloseCircle size={14} /> Passwords do not match
                  </motion.div>
                )}
                {passwordsMatch && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 mt-2 text-success font-semibold text-[11px] uppercase tracking-wider">
                    <TickCircle size={14} /> Passwords match
                  </motion.div>
                )}
              </div>
            </div>
            
            {(password || passwordConfirm) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-6 bg-warning/5 border border-warning/20 rounded-2xl p-5 flex items-start gap-4"
              >
                <div className="p-2 bg-warning/20 text-warning rounded-xl flex-shrink-0 mt-0.5">
                  <Lock size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-base-content mb-1">Password Security Tip</h4>
                  <p className="text-xs font-semibold text-base-content/60 leading-relaxed">
                    Use a strong, unique password with at least 8 characters. Leave blank to keep your current password.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 pb-10 border-b border-base-content/10">
        <div className="w-full lg:w-1/3">
          <h3 className="font-bold text-lg text-base-content">Preferences & Notifications</h3>
          <p className="text-sm font-medium text-base-content/50 mt-2">Manage your app experience and communication settings.</p>
        </div>
        <div className="w-full lg:w-2/3 space-y-4">
          
          <div className="bg-base-100/50 backdrop-blur-sm rounded-3xl border border-base-content/5 p-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" /></svg>
              </div>
              <div>
                <h4 className="font-bold text-base-content text-base">Calendar System</h4>
                <p className="text-xs font-semibold text-base-content/50 mt-1">Switch between Gregorian and Jalali</p>
              </div>
            </div>
            <Controller
              name="calendar_preference"
              control={control}
              render={({ field }) => (
                <select
                  className="select select-bordered font-bold bg-base-100 hover:border-primary w-40"
                  value={field.value || "gregorian"}
                  onChange={(e) => {
                    field.onChange(e);
                    updateMutation.mutate({ calendar_preference: e.target.value as "gregorian" | "jalali" }, {
                      onSuccess: () => reset({ ...watch(), calendar_preference: e.target.value as "gregorian" | "jalali" })
                    });
                  }}
                >
                  <option value="gregorian">Gregorian</option>
                  <option value="jalali">Jalali</option>
                </select>
              )}
            />
          </div>

          <div className="bg-base-100/50 backdrop-blur-sm rounded-3xl border border-base-content/5 p-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-success/10 rounded-2xl flex items-center justify-center text-success">
                <Sms size={24} />
              </div>
              <div>
                <h4 className="font-bold text-base-content text-base">Email Notifications</h4>
                <p className="text-xs font-semibold text-base-content/50 mt-1">Receive updates via Email</p>
              </div>
            </div>
            <Controller
              name="notify_via_email"
              control={control}
              render={({ field }) => (
                <input
                  type="checkbox"
                  className="toggle toggle-success toggle-lg"
                  checked={field.value}
                  onChange={(e) => {
                    field.onChange(e);
                    updateMutation.mutate({ notify_via_email: e.target.checked }, {
                      onSuccess: () => reset({ ...watch(), notify_via_email: e.target.checked })
                    });
                  }}
                />
              )}
            />
          </div>

          <div className="bg-base-100/50 backdrop-blur-sm rounded-3xl border border-base-content/5 p-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-info/10 rounded-2xl flex items-center justify-center text-info">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.18-.08-.05-.19-.02-.27 0-.12.03-1.98 1.25-5.58 3.69-.53.36-1.01.53-1.44.52-.47-.01-1.38-.27-2.05-.49-.83-.27-1.49-.41-1.43-.87.03-.23.36-.47 1-.72 3.93-1.71 6.55-2.84 7.85-3.38 3.74-1.56 4.51-1.83 5.02-1.84.11 0 .36.03.49.14.11.09.14.22.15.34-.01.07-.01.16-.03.26z" /></svg>
              </div>
              <div>
                <h4 className="font-bold text-base-content text-base">Telegram Connection</h4>
                <p className="text-xs font-semibold text-base-content/50 mt-1">Connect your account for Telegram updates</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Controller
                name="notify_via_telegram"
                control={control}
                render={({ field }) => (
                  <input
                    type="checkbox"
                    className="toggle toggle-info toggle-lg"
                    checked={field.value}
                    onChange={(e) => {
                      field.onChange(e);
                      updateMutation.mutate({ notify_via_telegram: e.target.checked }, {
                        onSuccess: () => reset({ ...watch(), notify_via_telegram: e.target.checked })
                      });
                    }}
                    disabled={!user.telegram_connected}
                    title={!user.telegram_connected ? "Please connect to Telegram first" : ""}
                  />
                )}
              />
              
              {!user.telegram_connected && (
                <button
                  type="button"
                  onClick={() => {
                    telegramMutation.mutate(undefined, {
                      onSuccess: () => setIsWaitingForTelegram(true)
                    });
                  }}
                  disabled={telegramMutation.isPending || isWaitingForTelegram}
                  className="btn btn-info font-bold text-info-content rounded-xl"
                >
                  {telegramMutation.isPending ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : isWaitingForTelegram ? (
                    <span className="flex items-center gap-2">
                      <span className="loading loading-spinner loading-xs"></span>
                      Waiting...
                    </span>
                  ) : (
                    "Connect"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Action Bar */}
      <div className="flex items-center justify-between bg-base-100/50 backdrop-blur-sm border border-base-content/10 rounded-3xl p-6 mt-8 shadow-sm">
        <div className="text-sm font-bold">
          {isDirty || profileImage ? (
            <span className="flex items-center gap-2 text-warning">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-warning"></span>
              </span>
              Unsaved changes
            </span>
          ) : (
            <span className="text-base-content/40">All changes saved</span>
          )}
        </div>
        <button
          type="submit"
          className="btn btn-primary rounded-xl px-8 font-black shadow-lg shadow-primary/20"
          disabled={updateMutation.isPending || (!isDirty && !profileImage)}
        >
          {updateMutation.isPending ? (
            <span className="flex items-center gap-2">
              <span className="loading loading-spinner loading-sm"></span>
              Saving
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <TickCircle className="w-5 h-5" />
              Save Changes
            </span>
          )}
        </button>
      </div>
    </form>
  );
};
