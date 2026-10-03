import { t as translate, useTranslation } from "../../../i18n/locale";
import React, { useState } from 'react';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { Eye, EyeOff, UserPlus, Trash2, ArrowRight, ArrowLeft } from 'lucide-react';

const ROLES = [
  { value: 'admin', get label() { return translate("Admin"); } },
  { value: 'employee', get label() { return translate("Employee"); } },
  { value: 'hr', get label() { return translate("HR"); } },
  { value: 'accountant', get label() { return translate("Accountant"); } },
];

export const StepAddUsers: React.FC = () => {
  const t = useTranslation();
  const { prevStep, nextStep, addPendingUser, removePendingUser, pendingUsers, orgData } = useOnboardingStore();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pendingUsers.some((u) => u.email === email || u.username === username)) {
      setError(t("A user with this email or username is already in the list."));
      return;
    }

    addPendingUser({ email, username, password, role });
    setEmail('');
    setUsername('');
    setPassword('');
    setRole('admin');
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-base-100 rounded-2xl border border-base-300 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-primary/5 border-b border-base-300 px-8 py-6">
          <h2 className="text-xl font-bold text-base-content">{t("Add Team Members")}</h2>
          <p className="text-sm text-heledone-ink-muted mt-0.5">
            {t("For")} <span className="font-semibold text-primary">{orgData.name}</span>  {t("— you can skip this and add members later.")}</p>
        </div>

        <div className="p-8 flex flex-col lg:flex-row gap-8">
          {/* Left: Form */}
          <div className="flex-1 space-y-4">
            <form onSubmit={handleAdd} className="space-y-4">
              {/* Email */}
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-medium">{t("Email")}</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input input-bordered w-full focus:input-primary"
                  placeholder={t("user@company.com")}
                  dir="ltr"
                />
              </div>

              {/* Username */}
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-medium">{t("Username")}</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input input-bordered w-full focus:input-primary"
                  placeholder={t("e.g. johndoe")}
                  dir="ltr"
                />
              </div>

              {/* Password */}
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-medium">{t("Password")}</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input input-bordered w-full pr-11 focus:input-primary"
                    placeholder={t("Min. 8 characters")}
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-heledone-ink-muted hover:text-base-content transition-colors z-10"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Role */}
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-medium">{t("Role")}</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="select select-bordered w-full focus:select-primary"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="alert alert-error py-2 text-sm">
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!email || !username || !password}
                className="btn btn-outline btn-primary w-full gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {t("Add to List")}</button>
            </form>
          </div>

          {/* Divider */}
          <div className="divider lg:divider-horizontal" />

          {/* Right: Pending users list */}
          <div className="w-full lg:w-72 flex flex-col">
            <h4 className="font-semibold text-base-content mb-3">
              {t("Users to be added")}{' '}
              <span className="badge badge-primary badge-sm ml-1">{pendingUsers.length}</span>
            </h4>

            {pendingUsers.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-heledone-ink-muted">
                <UserPlus className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">{t("No users added yet")}</p>
                <p className="text-xs mt-1">{t("They'll be created when you confirm")}</p>
              </div>
            ) : (
              <div className="space-y-2 flex-1 overflow-y-auto max-h-72">
                {pendingUsers.map((u, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-base-200 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-base-content truncate">@{u.username}</p>
                        <p className="text-xs text-heledone-ink-muted truncate">{u.email}</p>
                        <span className="badge badge-ghost badge-xs mt-0.5">{u.role}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePendingUser(idx)}
                      className="btn btn-ghost btn-xs text-error ml-2 flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-base-300 px-8 py-5 flex justify-between items-center">
          <button onClick={prevStep} className="btn btn-ghost gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t("بازگشت")}</button>
          <button onClick={nextStep} className="btn btn-primary gap-2">
            {t("Review & Confirm")}<ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
