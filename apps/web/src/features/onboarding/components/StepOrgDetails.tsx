import React, { useState } from 'react';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { ArrowRight } from 'lucide-react';

export const StepOrgDetails: React.FC = () => {
  const { nextStep, setOrgData, orgData } = useOnboardingStore();
  const [name, setName] = useState(orgData.name);
  const [description, setDescription] = useState(orgData.description);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setOrgData({ name: name.trim(), description: description.trim() });
    nextStep();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-base-100 rounded-2xl border border-base-300 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-primary/5 border-b border-base-300 px-8 py-6">
          <h2 className="text-xl font-bold text-base-content">Organization Details</h2>
          <p className="text-sm text-base-content/60 mt-0.5">Set up your workspace information</p>
        </div>

        {/* Body */}
        <form onSubmit={handleNext} className="p-8 space-y-6">
          <div className="form-control">
            <label className="label pb-2">
              <span className="label-text font-medium text-base-content">
                Organization Name <span className="text-error">*</span>
              </span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input input-bordered w-full focus:input-primary"
              placeholder="e.g. Acme Corporation"
              dir="auto"
            />
          </div>

          <div className="form-control">
            <label className="label pb-2">
              <span className="label-text font-medium text-base-content">Description</span>
              <span className="label-text-alt text-base-content/40">Optional</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="textarea textarea-bordered w-full focus:textarea-primary resize-none"
              placeholder="Brief description of your organization..."
              dir="auto"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={!name.trim()}
              className="btn btn-primary gap-2"
            >
              Next: Add Users
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
