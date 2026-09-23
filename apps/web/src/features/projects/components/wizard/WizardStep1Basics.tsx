import React from 'react';
import { useProjectWizardStore } from '../../store/useProjectWizardStore';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4', '#a855f7', '#64748b',
];

export const WizardStep1Basics: React.FC = () => {
  const {
    projectName, setProjectName,
    projectColor, setProjectColor,
    nextStep, close,
  } = useProjectWizardStore();

  const handleNext = () => {
    if (!projectName.trim()) return;
    nextStep();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-5">
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
          disabled={!projectName.trim()}
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
