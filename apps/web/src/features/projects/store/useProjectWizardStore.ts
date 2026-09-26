import { create } from 'zustand';

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  statuses: { name: string; code: string; category: string }[];
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: 'general',
    name: 'General Tasks',
    description: 'Simple & flexible for any team',
    icon: '✅',
    color: '#8b5cf6',
    statuses: [
      { name: 'To Do', code: 'todo', category: 'todo' },
      { name: 'Doing', code: 'doing', category: 'in_progress' },
      { name: 'Review', code: 'review', category: 'review' },
      { name: 'Done', code: 'done', category: 'done' },
    ],
  },
  {
    id: 'agile',
    name: 'Agile Software Development',
    description: 'Best for engineering & dev teams',
    icon: '🚀',
    color: '#6366f1',
    statuses: [
      { name: 'Backlog', code: 'backlog', category: 'todo' },
      { name: 'In Progress', code: 'in_progress', category: 'in_progress' },
      { name: 'Review', code: 'review', category: 'review' },
      { name: 'Done', code: 'done', category: 'done' },
    ],
  },
  {
    id: 'content',
    name: 'Content Production',
    description: 'Best for content & editorial teams',
    icon: '✍️',
    color: '#10b981',
    statuses: [
      { name: 'Ideas', code: 'ideas', category: 'todo' },
      { name: 'Drafting', code: 'drafting', category: 'in_progress' },
      { name: 'Review', code: 'review', category: 'review' },
      { name: 'Published', code: 'published', category: 'done' },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing Campaign',
    description: 'Best for marketing & growth teams',
    icon: '📢',
    color: '#f59e0b',
    statuses: [
      { name: 'Planning', code: 'planning', category: 'todo' },
      { name: 'In Progress', code: 'in_progress', category: 'in_progress' },
      { name: 'Review', code: 'review', category: 'review' },
      { name: 'Live', code: 'live', category: 'done' },
    ],
  },
];

interface ProjectWizardState {
  isOpen: boolean;
  currentStep: number;
  // Step 1
  projectName: string;
  projectColor: string;
  selectedOrgId: string | number | null;
  // Step 2
  selectedUserIds: (string | number)[];
  // Step 3
  selectedTemplate: BoardTemplate | null;

  // Actions
  open: () => void;
  close: () => void;
  nextStep: () => void;
  prevStep: () => void;
  setProjectName: (v: string) => void;
  setProjectColor: (v: string) => void;
  setSelectedOrgId: (id: string | number) => void;
  toggleUser: (id: string | number) => void;
  setSelectedTemplate: (t: BoardTemplate) => void;
  reset: () => void;
}

export const useProjectWizardStore = create<ProjectWizardState>((set) => ({
  isOpen: false,
  currentStep: 1,
  projectName: '',
  projectColor: '#6366f1',
  selectedOrgId: null,
  selectedUserIds: [],
  selectedTemplate: BOARD_TEMPLATES[0],

  open: () => set({ isOpen: true, currentStep: 1 }),
  close: () => set({ isOpen: false }),
  nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 3) })),
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) })),
  setProjectName: (v) => set({ projectName: v }),
  setProjectColor: (v) => set({ projectColor: v }),
  setSelectedOrgId: (id) => set({ selectedOrgId: id }),
  toggleUser: (id) =>
    set((s) => ({
      selectedUserIds: s.selectedUserIds.includes(id)
        ? s.selectedUserIds.filter((u) => u !== id)
        : [...s.selectedUserIds, id],
    })),
  setSelectedTemplate: (t) => set({ selectedTemplate: t }),
  reset: () =>
    set({
      currentStep: 1,
      projectName: '',
      projectColor: '#6366f1',
      selectedOrgId: null,
      selectedUserIds: [],
      selectedTemplate: BOARD_TEMPLATES[0],
    }),
}));
