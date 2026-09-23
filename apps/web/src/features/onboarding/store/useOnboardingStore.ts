import { create } from 'zustand';

interface OrgData {
  name: string;
  description: string;
}

interface UserData {
  email: string;
  username: string;
  password: string;
  role: string;
}


interface OnboardingState {
  currentStep: number;
  organizationId: string | null;
  orgData: OrgData;
  pendingUsers: UserData[];
  // Step 1: just collect info
  setOrgData: (data: OrgData) => void;
  // Step 2: manage pending users
  addPendingUser: (user: UserData) => void;
  removePendingUser: (index: number) => void;
  // Step navigation
  nextStep: () => void;
  prevStep: () => void;
  // After confirmed creation
  setOrganizationId: (id: string) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  currentStep: 1,
  organizationId: null,
  orgData: { name: '', description: '' },
  pendingUsers: [],
  setOrgData: (data) => set({ orgData: data }),
  addPendingUser: (user) => set((state) => ({ pendingUsers: [...state.pendingUsers, user] })),
  removePendingUser: (index) => set((state) => ({
    pendingUsers: state.pendingUsers.filter((_, i) => i !== index),
  })),
  nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 3) })),
  prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
  setOrganizationId: (id) => set({ organizationId: id }),
  reset: () => set({ currentStep: 1, organizationId: null, orgData: { name: '', description: '' }, pendingUsers: [] }),
}));
