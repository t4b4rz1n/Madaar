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
    defaultValues: {
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      password: "",
      password_confirm: "",
      notify_via_email: user?.notify_via_email ?? true,
      notify_via_telegram: user?.notify_via_telegram ?? false,
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

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
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
    if (profileImage) {
      updateData.profile_image = profileImage;
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-base-100 rounded-2xl border border-base-content/10 overflow-hidden">
          <div className="px-6 py-8 text-center border-b border-base-content/10">
            <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
                aria-label="Change profile image"
              >
                <span className="avatar">
                  <span className="w-28 rounded-full ring ring-primary ring-offset-base-100 ring-offset-4 overflow-hidden">
                    <img
                      src={currentProfileImage}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  </span>
                </span>
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-neutral/60 text-neutral-content opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <span className="flex flex-col items-center gap-1 text-xs font-semibold">
                    <Camera size={24} />
                    Change photo
                  </span>
                </span>
                <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-4 border-base-100 bg-primary text-primary-content shadow-md">
                  <Camera size={18} />
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleProfileImageChange}
                className="hidden"
              />
              <p className="text-xs text-base-content/50">
                Click the photo to upload a JPG, PNG or WebP image (max 5 MB).
              </p>

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

            {/* Integrations Section */}
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-5 bg-info rounded-full"></div>
                <h3 className="text-sm font-bold text-base-content/70 uppercase tracking-wider">
                  Integrations
                </h3>
              </div>

              <div className="bg-base-200/30 border border-base-content/10 rounded-xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#0088cc]/10 rounded-full flex items-center justify-center text-[#0088cc]">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.18-.08-.05-.19-.02-.27 0-.12.03-1.98 1.25-5.58 3.69-.53.36-1.01.53-1.44.52-.47-.01-1.38-.27-2.05-.49-.83-.27-1.49-.41-1.43-.87.03-.23.36-.47 1-.72 3.93-1.71 6.55-2.84 7.85-3.38 3.74-1.56 4.51-1.83 5.02-1.84.11 0 .36.03.49.14.11.09.14.22.15.34-.01.07-.01.16-.03.26z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-base-content">Telegram Connection</h4>
                    <p className="text-xs text-base-content/60 mt-0.5">Connect your account to receive notifications and manage tasks via Telegram.</p>
                  </div>
                </div>
                
                {user.telegram_connected ? (
                  <button
                    type="button"
                    disabled
                    className="btn btn-outline btn-success rounded-xl cursor-default"
                  >
                    <span className="flex items-center gap-2">
                      <TickCircle className="w-5 h-5" />
                      Connected
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      telegramMutation.mutate(undefined, {
                        onSuccess: () => {
                          setIsWaitingForTelegram(true);
                        }
                      });
                    }}
                    disabled={telegramMutation.isPending || isWaitingForTelegram}
                    className="btn btn-outline btn-info rounded-xl w-48"
                  >
                    {telegramMutation.isPending ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : isWaitingForTelegram ? (
                      <span className="flex items-center gap-2">
                        <span className="loading loading-spinner loading-xs"></span>
                        Waiting...
                      </span>
                    ) : (
                      "Connect to Telegram"
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Notification Preferences Section */}
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-5 bg-success rounded-full"></div>
                <h3 className="text-sm font-bold text-base-content/70 uppercase tracking-wider">
                  Notification Preferences
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-base-200/30 border border-base-content/10 rounded-xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center text-success">
                      <Sms size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-base-content">Email Notifications</h4>
                      <p className="text-xs text-base-content/60 mt-0.5">Receive updates via email</p>
                    </div>
                  </div>
                  <Controller
                    name="notify_via_email"
                    control={control}
                    render={({ field }) => (
                      <input 
                        type="checkbox" 
                        className="toggle toggle-success" 
                        checked={field.value}
                        onChange={field.onChange} 
                      />
                    )}
                  />
                </div>

                <div className="bg-base-200/30 border border-base-content/10 rounded-xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-info/10 rounded-full flex items-center justify-center text-info">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.18-.08-.05-.19-.02-.27 0-.12.03-1.98 1.25-5.58 3.69-.53.36-1.01.53-1.44.52-.47-.01-1.38-.27-2.05-.49-.83-.27-1.49-.41-1.43-.87.03-.23.36-.47 1-.72 3.93-1.71 6.55-2.84 7.85-3.38 3.74-1.56 4.51-1.83 5.02-1.84.11 0 .36.03.49.14.11.09.14.22.15.34-.01.07-.01.16-.03.26z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-base-content">Telegram Notifications</h4>
                      <p className="text-xs text-base-content/60 mt-0.5">Receive updates via Telegram</p>
                    </div>
                  </div>
                  <Controller
                    name="notify_via_telegram"
                    control={control}
                    render={({ field }) => (
                      <input 
                        type="checkbox" 
                        className="toggle toggle-info" 
                        checked={field.value}
                        onChange={field.onChange} 
                        disabled={!user.telegram_connected}
                        title={!user.telegram_connected ? "Please connect to Telegram first" : ""}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-base-content/10 bg-base-200/30">
            <div className="flex items-center justify-between">
              <div className="text-sm text-base-content/60">
                {isDirty || profileImage ? (
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
                disabled={updateMutation.isPending || (!isDirty && !profileImage)}
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
