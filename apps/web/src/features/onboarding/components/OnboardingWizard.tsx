import React from 'react';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { StepOrgDetails } from './StepOrgDetails';
import { StepAddUsers } from './StepAddUsers';
import { StepConfirm } from './StepConfirm';
import { AnimatePresence, motion } from 'motion/react';
import { Building2, Users, CheckCircle2 } from 'lucide-react';

const steps = [
  { label: 'Organization', icon: Building2 },
  { label: 'Add Users', icon: Users },
  { label: 'Confirm', icon: CheckCircle2 },
];

export const OnboardingWizard: React.FC = () => {
  const currentStep = useOnboardingStore((state) => state.currentStep);

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <StepOrgDetails />;
      case 2: return <StepAddUsers />;
      case 3: return <StepConfirm />;
      default: return <StepOrgDetails />;
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col items-center justify-center p-4 font-sans">
      {/* Logo / Brand area */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-base-content">Workspace Setup</h1>
        <p className="text-base-content/50 text-sm mt-1">Let's get your organization ready</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isActive = currentStep === stepNum;
          const isDone = currentStep > stepNum;
          const Icon = step.icon;
          return (
            <React.Fragment key={step.label}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isDone
                      ? 'bg-success text-success-content'
                      : isActive
                      ? 'bg-primary text-primary-content shadow-md shadow-primary/30'
                      : 'bg-base-300 text-base-content/40'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={`text-sm font-medium transition-colors ${
                    isActive ? 'text-primary' : isDone ? 'text-success' : 'text-base-content/40'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`w-12 h-0.5 rounded-full transition-colors duration-500 ${
                    currentStep > stepNum ? 'bg-success' : 'bg-base-300'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="w-full max-w-4xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
