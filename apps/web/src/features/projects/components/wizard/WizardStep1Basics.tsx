import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProjectWizardStore } from '../../store/useProjectWizardStore';
import { getOrganizations } from '../../../organizations/api/organizationsApi';
import { Building2, ChevronDown } from 'lucide-react';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4', '#a855f7', '#64748b',
];

export const WizardStep1Basics: React.FC = () => {
  const {
    projectName, setProjectName,
    projectColor, setProjectColor,
    selectedOrgId, setSelectedOrgId,
    nextStep, close,
  } = useProjectWizardStore();

  const { data: orgs = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['organizations-list'],
    queryFn: getOrganizations,
    staleTime: 1000 * 60 * 5,
  });

  // Auto-select first org if none selected
  React.useEffect(() => {
    if (!selectedOrgId && orgs.length > 0) {
      setSelectedOrgId(orgs[0].id);
    }
  }, [orgs, selectedOrgId, setSelectedOrgId]);

  const canProceed = projectName.trim() && selectedOrgId;

  const handleNext = () => {
    if (!canProceed) return;
    nextStep();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-5">

        {/* Organization Selector */}
        <div>
          <label className="block text-sm font-medium text-base-content/70 mb-1.5">
            Organization <span className="text-error">*</span>
          </label>
          {orgsLoading ? (
            <div className="input input-bordered flex items-center gap-2 bg-base-200/50">
              <span className="loading loading-spinner loading-xs" />
              <span className="text-sm text-base-content/50">Loading...</span>
            </div>
          ) : orgs.length === 0 ? (
            <div className="input input-bordered flex items-center gap-2 bg-base-200/50 text-error text-sm">
              No organizations found
            </div>
          ) : (
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40 pointer-events-none" />
              <select
                value={selectedOrgId ?? ''}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="select select-bordered w-full pl-9 bg-base-200/50 focus:select-primary appearance-none"
              >
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Project Name */}
        <div>
          <label className="block text-sm font-medium text-base-content/70 mb-1.5">
            Project Name <span className="text-error">*</span>
          </label>
          <input
            type="text"
            autoFocus
            required
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleNext(); }}
            className="input input-bordered w-full bg-base-200/50 focus:input-primary"
            placeholder="e.g. Q4 Product Launch"
            dir="auto"
          />
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-base-content/70 mb-2">
            Project Color
          </label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setProjectColor(c)}
                className="w-7 h-7 rounded-full transition-all duration-150"
                style={{
                  backgroundColor: c,
                  boxShadow: projectColor === c
                    ? `0 0 0 2px ${c}, 0 0 0 4px var(--fallback-b1,oklch(var(--b1)))`
                    : 'none',
                  transform: projectColor === c ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-6 mt-6 border-t border-base-300">
        <button type="button" onClick={close} className="btn btn-ghost btn-sm">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!canProceed}
          className="btn btn-primary btn-sm gap-2 px-6"
        >
          Next: Add Users
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};
