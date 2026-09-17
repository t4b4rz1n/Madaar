import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AttendanceStore {
  activeOrganizationId: string | null;
  setActiveOrganization: (id: string | null) => void;
  reset: () => void;
}

export const useAttendanceStore = create<AttendanceStore>()(
  persist(
    (set) => ({
      activeOrganizationId: null,
      setActiveOrganization: (id) => set({ activeOrganizationId: id }),
      reset: () => set({ activeOrganizationId: null }),
    }),
    {
      name: 'attendance-store',
    }
  )
);
