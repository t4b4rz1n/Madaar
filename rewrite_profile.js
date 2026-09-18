const fs = require('fs');
const path = require('path');

const file = path.join('apps', 'web', 'src', 'features', 'profile', 'components', 'ProfileEditForm.tsx');
let content = fs.readFileSync(file, 'utf8');

const newJSX = `  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">

        {/* Column 1: Profile & Personal Info */}
        <div className="flex flex-col gap-6">

          {/* Profile Picture Card */}
          <div className="bg-base-100 rounded-xl border border-base-content/10 p-6 flex flex-col items-center text-center">
            <h3 className="font-bold text-base-content self-start mb-4">Profile Picture</h3>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 mb-4"
              aria-label="Change profile image"
            >
              <div className="avatar">
                <div className="w-24 rounded-full bg-base-200 text-base-content/50 flex items-center justify-center overflow-hidden">
                  {currentProfileImage !== "/images/base-logo2.png" ? (
                    <img src={currentProfileImage} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl font-black">{user.first_name?.[0] || ""}{user.last_name?.[0] || ""}</span>
                  )}
                </div>
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" onChange={handleProfileImageChange} className="hidden" />

            <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-sm btn-outline rounded-lg bg-base-100 mb-4">
              Change Photo
            </button>

            <h2 className="font-bold text-xl text-base-content">{user.first_name} {user.last_name}</h2>
            {user.is_staff && (
              <span className="badge badge-success bg-success/10 text-success border-success/20 gap-1 font-bold mt-2 py-3 px-3">
                Staff Member <TickCircle size={14} variant="Bold" />
              </span>
            )}
          </div>

          {/* Personal Details Card */}
          <div className="bg-base-100 rounded-xl border border-base-content/10 p-6">
            <h3 className="font-bold text-base-content mb-4">Personal Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-base-content/70 mb-1">First Name</label>
                <Controller
                  name="first_name"
                  control={control}
                  render={({ field }) => (
                    <InputField {...field} value={field.value || ""} placeholder="First name" classNameInput="!bg-base-100 !h-10" />
                  )}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-base-content/70 mb-1">Last Name</label>
                <Controller
                  name="last_name"
                  control={control}
                  render={({ field }) => (
                    <InputField {...field} value={field.value || ""} placeholder="Last name" classNameInput="!bg-base-100 !h-10" />
                  )}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-base-content/70 mb-1">Email Address</label>
                <InputField name="email" value={user.email} onChange={() => {}} placeholder="Email" classNameInput="!bg-base-200/40 !border-transparent !cursor-not-allowed !text-base-content/60 !h-10" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-base-content/70 mb-1">Username</label>
                <InputField name="username" value={user.username} onChange={() => {}} placeholder="Username" classNameInput="!bg-base-200/40 !border-transparent !cursor-not-allowed !text-base-content/60 !h-10" />
              </div>
            </div>
          </div>

        </div>

        {/* Column 2: Security */}
        <div className="flex flex-col gap-6">
          <div className="bg-base-100 rounded-xl border border-base-content/10 p-6">
            <h3 className="font-bold text-base-content mb-4">Security</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-base-content/70 mb-1">New Password (hashed)</label>
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <InputField {...field} value={field.value || ""} type="password" placeholder="Hashed" classNameInput="!bg-base-100 !h-10" />
                  )}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-base-content/70 mb-1">Confirm Password (hashed)</label>
                <Controller
                  name="password_confirm"
                  control={control}
                  render={({ field }) => (
                    <InputField {...field} value={field.value || ""} type="password" placeholder="Hashed" classNameInput="!bg-base-100 !h-10" />
                  )}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-base-content/70 mb-1">Password strength</label>
                <div className="flex gap-1 h-1.5 mt-2">
                  <div className="flex-1 rounded-full bg-success"></div>
                  <div className="flex-1 rounded-full bg-success"></div>
                  <div className="flex-1 rounded-full bg-success"></div>
                  <div className="flex-1 rounded-full bg-base-200"></div>
                </div>
              </div>

              <div className="mt-6 bg-info/10 border-l-4 border-info rounded-r-lg p-4">
                <div className="flex gap-2">
                  <div className="text-info flex-shrink-0 mt-0.5"><Lock size={16} variant="Bold" /></div>
                  <div>
                    <h4 className="text-sm font-bold text-base-content mb-1">Security Tip</h4>
                    <p className="text-xs font-medium text-base-content/70">
                      Enable Two-Factor Authentication (2FA) for enhanced account security. Go to security settings to set up.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Preferences & Notifications */}
        <div className="flex flex-col gap-6">
          <div className="bg-base-100 rounded-xl border border-base-content/10 p-6">
            <h3 className="font-bold text-base-content mb-4">Preferences & Notifications</h3>
            <div className="space-y-6">

              <div>
                <label className="block text-xs font-semibold text-base-content/70 mb-2">Calendar System</label>
                <Controller
                  name="calendar_preference"
                  control={control}
                  render={({ field }) => (
                    <select
                      className="select select-bordered select-sm h-10 w-full bg-base-100"
                      value={field.value || "gregorian"}
                      onChange={(e) => {
                        field.onChange(e);
                        updateMutation.mutate({ calendar_preference: e.target.value as "gregorian" | "jalali" }, {
                          onSuccess: () => reset({ ...watch(), calendar_preference: e.target.value as "gregorian" | "jalali" })
                        });
                      }}
                    >
                      <option value="gregorian">Gregorian Calendar</option>
                      <option value="jalali">Jalali Calendar</option>
                    </select>
                  )}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-base-content">Email Notifications</h4>
                  <p className="text-xs font-bold text-success mt-1">{watch("notify_via_email") ? "Enabled" : "Disabled"}</p>
                </div>
                <Controller
                  name="notify_via_email"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      className="toggle toggle-success"
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

              <div>
                <h4 className="text-sm font-semibold text-base-content mb-2">Telegram Connection</h4>
                <div className="flex flex-col gap-2">
                  {user.telegram_connected ? (
                    <div className="flex items-center justify-center gap-2 w-full btn btn-sm h-10 btn-outline text-success border-success/30 hover:bg-success hover:text-success-content pointer-events-none">
                      <TickCircle size={18} variant="Bold" /> Connected
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => telegramMutation.mutate(undefined, { onSuccess: () => setIsWaitingForTelegram(true) })}
                      disabled={telegramMutation.isPending || isWaitingForTelegram}
                      className="btn btn-sm h-10 btn-outline border-base-content/20 bg-base-100 w-full flex items-center justify-center gap-2 text-info"
                    >
                      {telegramMutation.isPending || isWaitingForTelegram ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : (
                        <><Sms size={18} variant="Bold" /> Connect Telegram</>
                      )}
                    </button>
                  )}
                  <p className="text-xs text-center text-base-content/50 font-medium">
                    {user.telegram_connected ? "Notifications active" : "Not Connected"}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Save Action Bar */}
      <div className="flex items-center justify-between bg-base-100 border border-base-content/10 rounded-xl p-4 shadow-sm mt-4">
        <div className="text-sm font-bold pl-2">
          {isDirty || profileImage ? (
            <span className="flex items-center gap-2 text-warning">
              <div className="w-2 h-2 bg-warning rounded-full"></div>
              Unsaved changes
            </span>
          ) : (
            <span className="flex items-center gap-2 text-base-content/40">
              <div className="w-2 h-2 bg-base-content/20 rounded-full"></div>
              All changes saved
            </span>
          )}
        </div>
        <button
          type="submit"
          className="btn btn-neutral rounded-xl px-6 text-xs font-bold min-h-0 h-10"
          disabled={updateMutation.isPending || (!isDirty && !profileImage)}
        >
          {updateMutation.isPending ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </form>
  );
};
`;

const replaceStart = '  return (\n    <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 pb-24">';
const replaceIdx = content.indexOf(replaceStart);
if (replaceIdx === -1) {
  console.log('Error: Could not find return statement in ProfileEditForm.tsx');
  process.exit(1);
}

const newContent = content.substring(0, replaceIdx) + newJSX;
fs.writeFileSync(file, newContent, 'utf8');
