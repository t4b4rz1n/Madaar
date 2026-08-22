import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TaskStore {
  activeProjectId: string | null;
  activeBoardId: string | null;
  setActiveProject: (id: string | null) => void;
  setActiveBoard: (id: string | null) => void;
  reset: () => void;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      activeProjectId: null,
      activeBoardId: null,
      setActiveProject: (id) => set({ activeProjectId: id, activeBoardId: null }),
      setActiveBoard: (id) => set({ activeBoardId: id }),
      reset: () => set({ activeProjectId: null, activeBoardId: null }),
    }),
    {
      name: 'task-store',
    }
  )
);
