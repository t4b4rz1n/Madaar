import { create } from 'zustand';

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  statuses: { name: string; code: string }[];
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: 'agile',
    name: 'Agile Software Development',
    description: 'Best for engineering & dev teams',
    icon: '🚀',
    color: '#6366f1',
    statuses: [
      { name: 'Backlog', code: 'backlog' },
      { name: 'In Progress', code: 'in_progress' },
      { name: 'Review', code: 'review' },
      { name: 'Blocked', code: 'blocked' },
      { name: 'Done', code: 'done' },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing Campaign',
    description: 'Best for marketing & growth teams',
    icon: '📢',
    color: '#f59e0b',
    statuses: [
      { name: 'Ideas', code: 'ideas' },
      { name: 'Drafting', code: 'drafting' },
      { name: 'Design', code: 'design' },
      { name: 'Review', code: 'review' },
      { name: 'Published', code: 'published' },
    ],
  },
  {
    id: 'content',
    name: 'Content Production',
    description: 'Best for content & editorial teams',
    icon: '✍️',
    color: '#10b981',
    statuses: [
      { name: 'Ideas', code: 'ideas' },
      { name: 'Writing', code: 'writing' },
      { name: 'Editing', code: 'editing' },
      { name: 'Publishing', code: 'publishing' },
      { name: 'Published', code: 'published' },
    ],
  },
  {
    id: 'product',
    name: 'Product Roadmap',
    description: 'Best for product & design teams',
    icon: '🗺️',
    color: '#3b82f6',
    statuses: [
      { name: 'Exploration', code: 'exploration' },
      { name: 'Design', code: 'design' },
      { name: 'Development', code: 'development' },
      { name: 'Testing', code: 'testing' },
      { name: 'Released', code: 'released' },
    ],
  },
  {
    id: 'hr',
    name: 'HR & Recruitment',
    description: 'Best for HR & operations teams',
    icon: '👥',
    color: '#ec4899',
    statuses: [
      { name: 'Applications', code: 'applications' },
      { name: 'Screening', code: 'screening' },
      { name: 'Interview', code: 'interview' },
      { name: 'Offer', code: 'offer' },
      { name: 'Hired', code: 'hired' },
    ],
  },
  {
    id: 'general',
    name: 'General Tasks',
    description: 'Simple & flexible for any team',
    icon: '✅',
    color: '#8b5cf6',
    statuses: [
      { name: 'To Do', code: 'todo' },
      { name: 'In Progress', code: 'in_progress' },
      { name: 'In Review', code: 'in_review' },
      { name: 'Done', code: 'done' },
    ],
  },
];

interface ProjectWizardState {
  isOpen: boolean;
  currentStep: number;
  // Step 1
  projectName: string;
  projectDescription: string;
  projectColor: string;
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
  setProjectDescription: (v: string) => void;
  setProjectColor: (v: string) => void;
  toggleUser: (id: string | number) => void;
  setSelectedTemplate: (t: BoardTemplate) => void;
  reset: () => void;
}

export const useProjectWizardStore = create<ProjectWizardState>((set) => ({
  isOpen: false,
  currentStep: 1,
  projectName: '',
  projectDescription: '',
  projectColor: '#6366f1',
  selectedUserIds: [],
  selectedTemplate: BOARD_TEMPLATES[0],

  open: () => set({ isOpen: true, currentStep: 1 }),
  close: () => set({ isOpen: false }),
  nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 3) })),
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) })),
  setProjectName: (v) => set({ projectName: v }),
  setProjectDescription: (v) => set({ projectDescription: v }),
  setProjectColor: (v) => set({ projectColor: v }),
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
      projectDescription: '',
      projectColor: '#6366f1',
      selectedUserIds: [],
      selectedTemplate: BOARD_TEMPLATES[0],
    }),
}));
