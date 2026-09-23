import React from 'react';
import { useProjectWizardStore, BOARD_TEMPLATES } from '../../store/useProjectWizardStore';

export const WizardStep3Board: React.FC = () => {
  const { selectedTemplate, setSelectedTemplate, prevStep } = useProjectWizardStore();
  // Submit is handled by parent ProjectWizard
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <div className="grid grid-cols-2 gap-3">
          {BOARD_TEMPLATES.map((tmpl) => {
            const isSelected = selectedTemplate?.id === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => setSelectedTemplate(tmpl)}
                className={`relative text-left p-4 rounded-xl border-2 transition-all duration-150 ${
                  isSelected
                    ? 'border-primary bg-primary/8 shadow-lg shadow-primary/10'
                    : 'border-base-300 bg-base-200/40 hover:border-base-content/20 hover:bg-base-200/70'
                }`}
              >
                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <svg className="w-3 h-3 text-primary-content" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3"
                  style={{ backgroundColor: tmpl.color + '22', border: `1px solid ${tmpl.color}44` }}
                >
                  <span>{tmpl.icon}</span>
                </div>

                {/* Name */}
                <p className="text-sm font-semibold text-base-content leading-tight mb-1">
                  {tmpl.name}
                </p>
                <p className="text-xs text-base-content/50 mb-2">{tmpl.description}</p>

                {/* Columns preview */}
                <div className="flex flex-wrap gap-1">
                  {tmpl.statuses.slice(0, 4).map((s) => (
                    <span
                      key={s.code}
                      className="px-1.5 py-0.5 text-[10px] rounded font-medium"
                      style={{
                        backgroundColor: tmpl.color + '22',
                        color: tmpl.color,
                        border: `1px solid ${tmpl.color}33`,
                      }}
                    >
                      {s.name}
                    </span>
                  ))}
                  {tmpl.statuses.length > 4 && (
                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-base-300 text-base-content/50">
                      +{tmpl.statuses.length - 4}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-6 mt-4 border-t border-base-300">
        <button onClick={prevStep} className="btn btn-ghost btn-sm gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        {/* Submit button rendered by parent to have access to loading state */}
        <button
          type="submit"
          form="project-wizard-form"
          disabled={!selectedTemplate}
          className="btn btn-primary btn-sm gap-2 px-6"
        >
          Create Project 🚀
        </button>
      </div>
    </div>
  );
};
