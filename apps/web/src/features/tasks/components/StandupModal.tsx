import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import ApiService from '../../../core/api/apiService';
import { createStandup } from '../api/tasksApi';
import { CloseSquare } from 'iconsax-reactjs';

interface StandupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Organization {
  id: number;
  name: string;
}

interface StandupFormData {
  organizationId: string;
  yesterdayWork: string;
  todayWork: string;
  blockers: string;
}

export const StandupModal: React.FC<StandupModalProps> = ({ isOpen, onClose }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<StandupFormData>({
    defaultValues: {
      organizationId: '',
      yesterdayWork: '',
      todayWork: '',
      blockers: '',
    }
  });

  useEffect(() => {
    if (isOpen) {
      const fetchOrgs = async () => {
        setIsLoadingOrgs(true);
        try {
          const res: any = await ApiService.get<any>('/organizations/');
          const data = res?.results ?? res?.data?.results ?? res?.data ?? res;
          if (Array.isArray(data)) {
            setOrganizations(data);
          }
        } catch (error) {
          console.error("Failed to fetch organizations", error);
        } finally {
          setIsLoadingOrgs(false);
        }
      };
      fetchOrgs();
    } else {
      reset();
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: StandupFormData) => {
    setIsSubmitting(true);
    try {
      await createStandup(
        data.yesterdayWork,
        data.todayWork,
        data.blockers,
        data.organizationId || undefined
      );
      toast.success('Standup submitted successfully!');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit standup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-base-100 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
          <h2 className="text-lg font-bold text-base-content">Daily Standup</h2>
          <button onClick={onClose} className="text-base-content/50 hover:text-base-content transition-colors">
            <CloseSquare size="24" variant="Outline" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-base-content/70 mb-1">
              Organization
            </label>
            <select
              className={`select select-bordered w-full ${errors.organizationId ? 'select-error' : ''}`}
              disabled={isLoadingOrgs}
              {...register('organizationId', { required: 'Please select an organization' })}
            >
              <option value="" disabled hidden>Select your organization...</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
            {errors.organizationId && <p className="text-error text-xs mt-1">{errors.organizationId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-base-content/70 mb-1">
              What did you do yesterday?
            </label>
            <textarea
              className={`textarea textarea-bordered w-full h-24 custom-scrollbar ${errors.yesterdayWork ? 'textarea-error' : ''}`}
              placeholder="I completed the API integration..."
              {...register('yesterdayWork', { required: 'This field is required' })}
            />
            {errors.yesterdayWork && <p className="text-error text-xs mt-1">{errors.yesterdayWork.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-base-content/70 mb-1">
              What will you do today?
            </label>
            <textarea
              className={`textarea textarea-bordered w-full h-24 custom-scrollbar ${errors.todayWork ? 'textarea-error' : ''}`}
              placeholder="I will start working on the UI..."
              {...register('todayWork', { required: 'This field is required' })}
            />
            {errors.todayWork && <p className="text-error text-xs mt-1">{errors.todayWork.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-base-content/70 mb-1">
              Any blockers? <span className="text-base-content/40 text-xs font-normal">(Optional)</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full h-16 custom-scrollbar"
              placeholder="Waiting for design assets..."
              {...register('blockers')}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
