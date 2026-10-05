import { formatNumber as formatUiNumber } from "../../../i18n/locale";
import { getErrorMessage as translateError } from "../../../core/utils/errorHandler";
import { useTranslation } from "../../../i18n/locale";
import React, { useState } from 'react';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useAuthStore } from '../../auth/store/authStore';
import ApiService from '../../../core/api/apiService';
import { toast } from 'sonner';
import {
  Building2, Users, CheckCircle2, ArrowLeft, Loader2,
} from 'lucide-react';


export const StepConfirm: React.FC = () => {
  const t = useTranslation();
  const { orgData, pendingUsers, prevStep, setOrganizationId } = useOnboardingStore();
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState('');


  const handleConfirm = async () => {
    setLoading(true);
    try {
      // 1) Create organization
      setProgress(t("Creating organization..."));
      const orgResponse = await ApiService.post('/organizations/', {
        name: orgData.name,
        description: orgData.description,
      });
      const orgId: string = orgResponse.data.id;
      setOrganizationId(orgId);

      // 2) Mark onboarding as done for this user in localStorage (permanent flag)
      if (user?.id) {
        localStorage.setItem(`onboarding_done_${user.id}`, 'true');
      }

      // 3) Create pending users
      const failedUsers: string[] = [];
      for (const u of pendingUsers) {
        setProgress(t("Adding user @{value0}...", { value0: u.username }));
        try {
          await ApiService.post(`/organizations/${orgId}/invite_member/`, {
            email: u.email,
            username: u.username,
            password: u.password,
            role_id: u.role,
          });
        } catch (err: any) {
          const detail = err.response?.data?.detail || t("Failed to add @{value0}", { value0: u.username });
          failedUsers.push(`@${u.username}: ${detail}`);
        }
      }

      if (failedUsers.length > 0) {
        failedUsers.forEach((msg) => toast.error(msg, { duration: 6000 }));
      }

      setProgress('');
      setDone(true);
      toast.success(t("Workspace created successfully!"));

      // Use hard navigation so the app fully re-initializes with the new org in context.
      // This avoids race conditions between the onboarding-done flag and React Router's re-render cycle.
      setTimeout(() => {
        window.location.href = '/projects?wizard=1';
      }, 1200);
    } catch (err: any) {
      toast.error(translateError(err.response?.data?.detail || 'Failed to create organization'));
      setLoading(false);
    }
  };


  if (done) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="bg-base-100 rounded-2xl border border-base-300 shadow-lg p-12">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-base-content mb-2">{t("All set!")}</h2>
          <p className="text-heledone-ink-muted mb-2">
            <strong>{orgData.name}</strong>  {t("has been created.")}</p>
          <p className="text-heledone-ink-muted text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("Redirecting to Projects...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-base-100 rounded-2xl border border-base-300 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-primary/5 border-b border-base-300 px-8 py-6">
          <h2 className="text-xl font-bold text-base-content">{t("Review & Confirm")}</h2>
          <p className="text-sm text-heledone-ink-muted mt-0.5">
            {t("Everything below will be created when you click Confirm.")}</p>
        </div>

        <div className="p-8 space-y-6">
          {/* Org info */}
          <div className="rounded-xl bg-base-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="w-5 h-5 text-primary" />
              <span className="font-semibold text-base-content">{t("Organization")}</span>
            </div>
            <p className="text-lg font-bold text-base-content ps-8">{orgData.name}</p>
            {orgData.description && (
              <p className="text-sm text-heledone-ink-muted ps-8 mt-1">{orgData.description}</p>
            )}
          </div>

          {/* Users */}
          <div className="rounded-xl bg-base-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-5 h-5 text-primary" />
              <span className="font-semibold text-base-content">
                {t("Users to create")}{' '}
                <span className="badge badge-primary badge-sm">{formatUiNumber(pendingUsers.length)}</span>
              </span>
            </div>
            {pendingUsers.length === 0 ? (
              <p className="text-sm text-heledone-ink-muted ps-8">{t("No users — you can add them later from Settings.")}</p>
            ) : (
              <div className="space-y-2 ps-8">
                {pendingUsers.map((u, i) => (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-base-content">@{u.username}</span>
                      <span className="text-xs text-heledone-ink-muted ms-2">{u.email}</span>
                      <span className="badge badge-ghost badge-xs ms-2">{u.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-base-300 px-8 py-5 flex justify-between items-center">
          <button onClick={prevStep} disabled={loading} className="btn btn-ghost gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t("بازگشت")}</button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="btn btn-primary gap-2 min-w-[160px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {progress || t("Creating...")}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {t("Confirm & Create")}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
