import React, { useState } from 'react';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useAuthStore } from '../../auth/store/authStore';
import { useQueryClient } from '@tanstack/react-query';
import ApiService from '../../../core/api/apiService';
import { toast } from 'sonner';
import {
  Building2, Users, CheckCircle2, ArrowLeft, Loader2, ChevronRight,
} from 'lucide-react';

export const StepConfirm: React.FC = () => {
  const { orgData, pendingUsers, prevStep, setOrganizationId, reset } = useOnboardingStore();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // 1) Create organization
      setProgress('Creating organization...');
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
        setProgress(`Adding user @${u.username}...`);
        try {
          await ApiService.post(`/organizations/${orgId}/invite_member/`, {
            email: u.email,
            username: u.username,
            password: u.password,
            role_id: u.role,
          });
        } catch (err: any) {
          const detail = err.response?.data?.detail || `Failed to add @${u.username}`;
          failedUsers.push(`@${u.username}: ${detail}`);
        }
      }

      if (failedUsers.length > 0) {
        failedUsers.forEach((msg) => toast.error(msg, { duration: 6000 }));
      }

      setProgress('');
      setDone(true);
      toast.success('Workspace created successfully!');

      // Invalidate so MainLayout re-checks and exits wizard
      queryClient.invalidateQueries({ queryKey: ['organizations-list'] });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create organization');
      setLoading(false);
    }
  };

  const handleFinish = () => {
    reset();
    // Force a reload so MainLayout picks up the new org
    window.location.reload();
  };

  if (done) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="bg-base-100 rounded-2xl border border-base-300 shadow-lg p-12">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-base-content mb-2">All set!</h2>
          <p className="text-base-content/60 mb-2">
            <strong>{orgData.name}</strong> has been created.
          </p>
          {pendingUsers.length > 0 && (
            <p className="text-base-content/50 text-sm mb-6">
              {pendingUsers.length} user(s) were processed.
            </p>
          )}
          <button
            onClick={handleFinish}
            className="btn btn-primary btn-wide gap-2"
          >
            Go to Dashboard
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-base-100 rounded-2xl border border-base-300 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-primary/5 border-b border-base-300 px-8 py-6">
          <h2 className="text-xl font-bold text-base-content">Review & Confirm</h2>
          <p className="text-sm text-base-content/60 mt-0.5">
            Everything below will be created when you click Confirm.
          </p>
        </div>

        <div className="p-8 space-y-6">
          {/* Org info */}
          <div className="rounded-xl bg-base-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="w-5 h-5 text-primary" />
              <span className="font-semibold text-base-content">Organization</span>
            </div>
            <p className="text-lg font-bold text-base-content pl-8">{orgData.name}</p>
            {orgData.description && (
              <p className="text-sm text-base-content/60 pl-8 mt-1">{orgData.description}</p>
            )}
          </div>

          {/* Users */}
          <div className="rounded-xl bg-base-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-5 h-5 text-primary" />
              <span className="font-semibold text-base-content">
                Users to create{' '}
                <span className="badge badge-primary badge-sm">{pendingUsers.length}</span>
              </span>
            </div>
            {pendingUsers.length === 0 ? (
              <p className="text-sm text-base-content/50 pl-8">No users — you can add them later from Settings.</p>
            ) : (
              <div className="space-y-2 pl-8">
                {pendingUsers.map((u, i) => (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-base-content">@{u.username}</span>
                      <span className="text-xs text-base-content/50 ml-2">{u.email}</span>
                      <span className="badge badge-ghost badge-xs ml-2">{u.role}</span>
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
            Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="btn btn-primary gap-2 min-w-[160px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {progress || 'Creating...'}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Confirm & Create
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
