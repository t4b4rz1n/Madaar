import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { X } from 'lucide-react';

import { useProjectWizardStore } from '../../store/useProjectWizardStore';
import { useQuery } from '@tanstack/react-query';
import { getOrganizations } from '../../../organizations/api/organizationsApi';

import { createProject, addProjectMember } from '../../api/projectsApi';
import { createBoard, createStatus } from '../../../tasks/api/tasksApi';

import { WizardStep1Basics } from './WizardStep1Basics';
import { WizardStep2Users } from './WizardStep2Users';
import { WizardStep3Board } from './WizardStep3Board';


const STEPS = [
  { number: 1, label: 'Basics', sublabel: 'Project info' },
  { number: 2, label: 'Users', sublabel: 'Add members' },
  { number: 3, label: 'Board', sublabel: 'Choose template' },
];

export const ProjectWizard: React.FC = () => {
  const navigate = useNavigate();
  const { isOpen, close, reset,
    currentStep,
    projectName, projectDescription, projectColor,
    selectedUserIds, selectedTemplate,
  } = useProjectWizardStore();

  const [isSubmitting, setIsSubmitting] = useState(false);


  const { data: orgs } = useQuery({
    queryKey: ['organizations-list'],
    queryFn: getOrganizations,
    staleTime: 1000 * 60 * 5,
    enabled: isOpen,
  });
  const orgId = orgs?.[0]?.id as string | undefined;


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !selectedTemplate) return;

    setIsSubmitting(true);
    try {
      // 1. Create project
      const project = await createProject({
        name: projectName,
        description: projectDescription,
        color: projectColor,
        organization_id: orgId,
      });

      // 2. Add selected users
      const addMemberPromises = selectedUserIds.map((uid) =>
        addProjectMember(project.id, { user_id: uid }).catch(() => null)
      );
      await Promise.all(addMemberPromises);

      // 3. Create board
      const board = await createBoard(
        String(project.id),
        selectedTemplate.name,
        projectColor
      );

      // 4. Create statuses (columns) for the board
      const statusPromises = selectedTemplate.statuses.map((s) =>
        createStatus(board.id, s.name, s.code).catch(() => null)
      );

      await Promise.all(statusPromises);

      toast.success(`"${projectName}" created!`);
      reset();
      close();

      // Navigate to project board
      navigate(`/projects/${project.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      close();
      reset();
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="w-full flex overflow-hidden"
            style={{ maxWidth: currentStep === 3 ? '680px' : '560px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ─── Left sidebar: stepper ─── */}
            <div
              className="hidden md:flex flex-col w-52 flex-shrink-0 p-6 rounded-l-2xl"
              style={{
                background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 60%, #1e1b4b 100%)',
              }}
            >
              {/* Logo area */}
              <div className="mb-8">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-white font-bold text-sm">New Project</h3>
                <p className="text-white/50 text-xs mt-0.5">Wizard setup</p>
              </div>

              {/* Steps */}
              <div className="flex flex-col gap-0">
                {STEPS.map((step, idx) => {
                  const done = currentStep > step.number;
                  const active = currentStep === step.number;
                  return (
                    <div key={step.number} className="flex flex-col">
                      <div className="flex items-start gap-3">
                        {/* Circle */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all flex-shrink-0 ${
                              done
                                ? 'bg-white text-indigo-900'
                                : active
                                ? 'bg-indigo-400 text-white ring-2 ring-white/30 ring-offset-1 ring-offset-transparent'
                                : 'bg-white/10 text-white/40'
                            }`}
                          >
                            {done ? (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              step.number
                            )}
                          </div>
                          {idx < STEPS.length - 1 && (
                            <div
                              className="w-0.5 my-1 transition-all"
                              style={{
                                height: '36px',
                                backgroundColor: done ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)',
                              }}
                            />
                          )}
                        </div>
                        {/* Text */}
                        <div className="pt-0.5">
                          <p className={`text-sm font-semibold leading-tight ${active ? 'text-white' : done ? 'text-white/70' : 'text-white/30'}`}>
                            {step.label}
                          </p>
                          <p className={`text-xs mt-0.5 ${active ? 'text-white/60' : 'text-white/20'}`}>
                            {step.sublabel}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom hint */}
              <div className="mt-auto pt-6">
                <p className="text-white/25 text-[11px] leading-relaxed">
                  You can always edit project settings later from the project page.
                </p>
              </div>
            </div>

            {/* ─── Right panel: content ─── */}
            <div className="flex-1 bg-base-100 rounded-r-2xl md:rounded-l-none rounded-l-2xl flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-base-300">
                <div>
                  <h2 className="font-bold text-base-content text-base">
                    {currentStep === 1 && 'Project Details'}
                    {currentStep === 2 && 'Add Users'}
                    {currentStep === 3 && 'Board Template'}
                  </h2>
                  <p className="text-xs text-base-content/50 mt-0.5">
                    Step {currentStep} of {STEPS.length}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="btn btn-ghost btn-circle btn-sm"
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-hidden">
                <div className="p-6 h-full flex flex-col">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="flex-1 flex flex-col"
                    >
                      {currentStep === 1 && <WizardStep1Basics />}
                      {currentStep === 2 && <WizardStep2Users />}
                      {currentStep === 3 && (
                        <div className="flex-1 flex flex-col">
                          <WizardStep3Board onSubmit={handleSubmit} isSubmitting={isSubmitting} />
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
