import { formatNumber as formatUiNumber } from "../../../../i18n/locale";
import { useTranslation } from "../../../../i18n/locale";
import { getWorkflowAppearance } from "../../../../core/config/designTokens";
import React from 'react';
import { useProjectWizardStore, BOARD_TEMPLATES } from '../../store/useProjectWizardStore';

interface Props {
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export const WizardStep3Board: React.FC<Props> = ({ onSubmit, isSubmitting }) => {
  const t = useTranslation();
  const { selectedTemplate, setSelectedTemplate, prevStep } = useProjectWizardStore();

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
                className={`relative text-start p-4 rounded-xl border-2 transition-all duration-150 ${
                  isSelected
                    ? 'border-primary bg-primary/8 shadow-lg shadow-primary/10'
                    : 'border-base-300 bg-base-200/40 hover:border-base-content/20 hover:bg-base-200/70'
                }`}
              >
                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute top-2.5 end-2.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
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
                <p className="text-xs text-heledone-ink-muted mb-2">{tmpl.description}</p>

                {/* Columns preview */}
                <div className="flex flex-wrap gap-1">
                  {tmpl.statuses.slice(0, 4).map((s) => (
                    <span
                      key={s.code}
                      className="px-1.5 py-0.5 text-[13px] rounded font-medium"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${getWorkflowAppearance(s).color} 10%, transparent)`,
                        color: getWorkflowAppearance(s).ink,
                        border: `1px solid color-mix(in srgb, ${getWorkflowAppearance(s).color} 25%, transparent)`,
                      }}
                    >
                      {getWorkflowAppearance(s).label}
                    </span>
                  ))}
                  {tmpl.statuses.length > 4 && (
                    <span className="px-1.5 py-0.5 text-[13px] rounded bg-base-300 text-heledone-ink-muted">
                      +{formatUiNumber(tmpl.statuses.length - 4)}
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
        <button type="button" onClick={prevStep} className="btn btn-ghost btn-sm gap-2" disabled={isSubmitting}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t("بازگشت")}</button>
        <button
          type="button"
          onClick={onSubmit as any}
          disabled={!selectedTemplate || isSubmitting}
          className="btn btn-primary btn-sm gap-2 px-6"
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-xs" />
              {t("Creating...")}</>
          ) : (
            <>{t("Create Project 🚀")}</>
          )}
        </button>
      </div>
    </div>
  );
};
