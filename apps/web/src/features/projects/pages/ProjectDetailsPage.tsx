import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowDown2,
  People,
  TaskSquare,
  Activity,
  Add,
  Trash,
  Crown,
  Flag,
  Chart,
} from "iconsax-reactjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useProject,
  useProjectMembers,
  useProjectMilestones,
  useProjectActivities,
  useRemoveProjectMember,
  useUpdateProject,
  useDeleteMilestone,
} from "../hooks/useProjects";
import type { ProjectMember, Milestone, ProjectActivity } from "../types";
import { useTaskStore } from "../../tasks/store/useTaskStore";
import { AddMemberModal } from "../components/AddMemberModal";
import CumulativeFlowChart from "../components/CumulativeFlowChart";
import CycleLeadTimeReport from "../components/CycleLeadTimeReport";
import MilestoneBurndownChart from "../components/MilestoneBurndownChart";
import { CreateMilestoneModal } from "../components/CreateMilestoneModal";
import { EditMilestoneModal } from "../components/EditMilestoneModal";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { toast } from "sonner";
import { getUnlinkedTasks, getTask, updateTask, getMilestoneTasks } from "../../tasks/api/tasksApi";
import { TaskSheet } from "../../tasks/components/TaskSheet";

type TabType = "overview" | "members" | "milestones" | "activity" | "analytics";

const DEFAULT_COLOR = "#6366f1";

const statusStyles: Record<string, string> = {
  active:    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  draft:     "bg-base-200 text-base-content/65",
  on_hold:   "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  completed: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  archived:  "bg-red-500/15 text-red-500",
};

const milestoneStatusConfig: Record<string, { label: string; cls: string }> = {
  pending:     { label: "Pending",     cls: "bg-base-200 text-base-content/55" },
  in_progress: { label: "In Progress", cls: "bg-blue-500/15 text-blue-600" },
  completed:   { label: "Done",        cls: "bg-emerald-500/15 text-emerald-600" },
  cancelled:   { label: "Cancelled",   cls: "bg-red-500/15 text-red-500" },
};

const getUserDisplayName = (member: ProjectMember) => {
  if (member.team) return member.team.name;
  if (!member.user) return "Member";
  const fullName =
    `${member.user.first_name || ""} ${member.user.last_name || ""}`.trim();
  if (fullName) return fullName;
  return member.user.username || member.user.email || "User";
};

const formatDate = (value?: string | null) => {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

function MilestoneItem({
  ms,
  projectId,
  onEdit,
  onDelete
}: {
  ms: Milestone;
  projectId: string;
  onEdit: (ms: Milestone) => void;
  onDelete: (ms: Milestone) => void;
}) {
  const msCfg = milestoneStatusConfig[ms.status] ?? milestoneStatusConfig.pending;
  const [showChart, setShowChart] = useState(false);
  const setSelectedTaskId = useTaskStore(state => state.setSelectedTaskId);

  const { data: milestoneTasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ["milestone-tasks", projectId, ms.id],
    queryFn: () => getMilestoneTasks(projectId, ms.id),
    enabled: showChart,
  });

  const total = ms.task_count || 0;
  const completed = ms.completed_task_count || 0;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-base-content/6 bg-base-200/40 p-3 text-xs transition-all">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setShowChart(!showChart)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Flag size={15} className="shrink-0 text-primary" />
          <div className="min-w-0 flex flex-col gap-1">
            <p dir="auto" className="font-bold text-base-content truncate">
              {ms.title}
            </p>
            <div className="flex items-center gap-3 text-[10px] text-base-content/45">
              {ms.target_date && <span>Target: {formatDate(ms.target_date)}</span>}
              <div className="flex items-center gap-1.5" title={`${completed} of ${total} tasks completed`}>
                <TaskSquare size={12} className="text-base-content/40" />
                <span>{completed}/{total}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onEdit(ms)}
              className="p-1 rounded-md text-base-content/40 hover:text-primary hover:bg-base-200"
              title="Edit Milestone"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button
              onClick={() => onDelete(ms)}
              className="p-1 rounded-md text-base-content/40 hover:text-error hover:bg-base-200"
              title="Delete Milestone"
            >
              <Trash size={14} variant="Bold" />
            </button>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1 mr-2">
            <div className="text-[10px] font-medium text-base-content/60">{progressPercent}%</div>
            <div className="w-16 h-1.5 rounded-full bg-base-300 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <span className={`rounded-md px-2.5 py-1 text-[10px] font-bold ${msCfg.cls}`}>
            {msCfg.label}
          </span>
          <ArrowDown2 size={14} className={`text-base-content/50 transition-transform ${showChart ? "rotate-180" : ""}`} />
        </div>
      </div>
      <AnimatePresence initial={false}>
        {showChart && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-3 border-t border-base-content/8 mt-1 flex flex-col gap-4">
              <MilestoneBurndownChart milestoneId={String(ms.id)} />

              {/* Tasks List */}
              <div className="px-2 pb-2">
                <h4 className="text-[11px] font-bold text-base-content/50 uppercase tracking-wider mb-2">
                  Linked Tasks ({milestoneTasks.length})
                </h4>
                {isLoadingTasks ? (
                  <div className="flex justify-center p-4">
                    <span className="loading loading-dots loading-sm opacity-50"></span>
                  </div>
                ) : milestoneTasks.length > 0 ? (
                  <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                    {milestoneTasks.map((task: any) => (
                      <div
                        key={task.id}
                        className="group/task flex items-center justify-between p-3 rounded-xl bg-base-100/40 hover:bg-base-100 border border-base-content/5 hover:border-base-content/10 hover:shadow-sm cursor-pointer transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTaskId(String(task.id));
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`size-2 shrink-0 rounded-full ${task.status?.is_done || task.is_finished ? "bg-emerald-500" : "bg-base-content/20"}`} />
                          <p
                            dir="auto"
                            className={`font-semibold truncate ${task.status?.is_done || task.is_finished ? "line-through text-base-content/40" : "text-[12px] text-base-content/90 group-hover/task:text-primary transition-colors"}`}
                          >
                            {task.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0 opacity-70 group-hover/task:opacity-100 transition-opacity">
                          {task.priority && (
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              task.priority === "critical"
                                ? "bg-red-500/15 text-red-600 dark:text-red-400"
                                : task.priority === "high"
                                ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                                : task.priority === "medium"
                                ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-500"
                                : "bg-base-content/10 text-base-content/70"
                            }`}>
                              {task.priority}
                            </span>
                          )}
                          {task.status?.name && (
                            <span className="text-[10px] font-medium text-base-content/60 bg-base-content/5 px-2 py-0.5 rounded-full border border-base-content/10">
                              {task.status.name}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-base-content/40 text-center py-2 bg-base-100/30 rounded-lg">
                    No tasks linked to this milestone yet.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
  { id: "overview",   label: "Overview",    icon: <TaskSquare size={15} /> },
  { id: "members",    label: "Members",     icon: <People size={15} /> },
  { id: "milestones", label: "Milestones",  icon: <Flag size={15} /> },
  { id: "activity",   label: "Activity",    icon: <Activity size={15} /> },
  { id: "analytics",  label: "Analytics",   icon: <Chart size={15} /> },
];


const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

function StatusDropdown({
  currentStatus,
  onChange,
  disabled
}: {
  currentStatus: string;
  onChange: (s: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedOption = STATUS_OPTIONS.find((o) => o.value === currentStatus) || STATUS_OPTIONS[0];

  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, []);

  return (
    <div className="relative z-[100]" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 cursor-pointer appearance-none rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide outline-none transition-all hover:opacity-80 ${statusStyles[currentStatus] || statusStyles.draft}`}
      >
        {selectedOption.label}
        <ArrowDown2 size={14} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-7 min-w-[120px] rounded-xl border border-base-content/10 bg-base-100 p-1.5 shadow-xl"
          >
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[11px] transition-colors hover:bg-base-content/5 ${
                  currentStatus === opt.value ? "bg-primary/10 font-bold text-primary" : "font-medium text-base-content"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── MilestonesTab ────────────────────────────────────────────────────────────

function MilestonesTab({
  milestones,
  projectId,
  project,
  onCreateMilestone,
}: {
  milestones: Milestone[];
  projectId: string;
  project: any;
  onCreateMilestone: () => void;
}) {
  // Calculate weighted progress
  const totalWeight = milestones.reduce((s, m) => s + (m.weight || 1), 0);
  const completedWeight = milestones
    .filter((m) => m.status === "completed")
    .reduce((s, m) => s + (m.weight || 1), 0);
  const weightedProgress = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

  const unlinkedCount = project?.unlinked_task_count || 0;

  // Only fetch unlinked tasks if there are any
  const { data: unlinkedTasks = [], isLoading: loadingUnlinked } = useQuery({
    queryKey: ["unlinked-tasks", projectId],
    queryFn: () => getUnlinkedTasks(projectId),
    enabled: unlinkedCount > 0,
    staleTime: 60_000,
  });

  const setSelectedTaskId = useTaskStore(state => state.setSelectedTaskId);
  const [milestoneToEdit, setMilestoneToEdit] = useState<Milestone | null>(null);
  const [milestoneToDelete, setMilestoneToDelete] = useState<Milestone | null>(null);
  const deleteMilestoneMutation = useDeleteMilestone(projectId);

  const handleDeleteConfirm = () => {
    if (!milestoneToDelete) return;
    deleteMilestoneMutation.mutate(milestoneToDelete.id, {
      onSuccess: () => {
        toast.success("Milestone deleted.");
        setMilestoneToDelete(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Header card with weighted progress */}
      <div className="rounded-2xl border border-base-content/8 bg-base-100 p-5">
        <div className="flex items-center justify-between border-b border-base-content/8 pb-3 mb-4">
          <h3 className="text-sm font-bold text-base-content">
            Project Milestones ({milestones.length})
          </h3>
          <button
            type="button"
            onClick={onCreateMilestone}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-content"
          >
            <Add size={14} /> New Milestone
          </button>
        </div>

        {/* Weighted progress bar */}
        {milestones.length > 0 && (
          <div className="mb-5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-base-content/60 uppercase tracking-wider text-[10px]">
                Weighted Project Progress
              </span>
              <span className="font-black text-primary">{weightedProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-base-300">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${weightedProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-base-content/40">
              Based on milestone weights — only completed milestones count toward progress.
            </p>
          </div>
        )}

        {/* Milestone list */}
        {milestones.length === 0 ? (
          <p className="py-8 text-center text-xs text-base-content/40">
            No milestones added to this project yet.
          </p>
        ) : (
          <div className="space-y-2">
            {milestones.map((ms: Milestone) => (
              <div key={ms.id} className="flex flex-col gap-2">
                {/* Weight badge added to each milestone row */}
                <div className="flex items-center gap-2 group">
                  <div className="flex-1">
                    <MilestoneItem
                      ms={ms}
                      projectId={projectId}
                      onEdit={setMilestoneToEdit}
                      onDelete={setMilestoneToDelete}
                    />
                  </div>
                  <div
                    className="shrink-0 rounded-lg bg-base-200 px-2 py-1 text-[10px] font-bold text-base-content/60 whitespace-nowrap"
                    title="Milestone weight (contributes this much to project progress)"
                  >
                    Weight: {ms.weight || 1}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unlinked Tasks section */}
      {unlinkedCount > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-base-100 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-base-content/8 pb-3">
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500 shrink-0">
                <path d="M12 2L2 22h20L12 2zm0 3.5L19.5 20h-15L12 5.5zM11 10v5h2v-5h-2zm0 6v2h2v-2h-2z"/>
              </svg>
              <h3 className="text-sm font-bold text-base-content">
                Unlinked Tasks
                <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                  {unlinkedCount}
                </span>
              </h3>
            </div>
          </div>
          <p className="text-[10px] text-base-content/50 -mt-2">
            These tasks are not linked to any milestone and do <strong>not</strong> affect project progress.
          </p>

          {loadingUnlinked ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-9 animate-pulse rounded-xl bg-base-200/70" />
              ))}
            </div>
          ) : unlinkedTasks.length === 0 ? (
            <p className="py-4 text-center text-xs text-base-content/40">Loading…</p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {unlinkedTasks.map((task: any) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="flex items-center justify-between rounded-xl border border-base-content/6 bg-base-200/40 px-3 py-2.5 text-xs cursor-pointer hover:bg-base-200/70 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`size-2 shrink-0 rounded-full ${task.is_finished ? "bg-emerald-500" : "bg-base-content/20"}`} />
                    <span
                      dir="auto"
                      className={`font-semibold truncate ${task.is_finished ? "line-through text-base-content/40" : "text-base-content"}`}
                    >
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {task.priority && (
                      <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        task.priority === "critical" ? "bg-red-500/15 text-red-500" :
                        task.priority === "high" ? "bg-orange-500/15 text-orange-500" :
                        task.priority === "medium" ? "bg-amber-500/15 text-amber-600" :
                        "bg-base-content/10 text-base-content/50"
                      }`}>
                        {task.priority}
                      </span>
                    )}
                    {task.assignee && (
                      <span className="text-[10px] text-base-content/40 truncate max-w-[80px]">
                        {task.assignee.full_name || task.assignee.username || "Assigned"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Milestone Modal */}
      <EditMilestoneModal
        isOpen={!!milestoneToEdit}
        onClose={() => setMilestoneToEdit(null)}
        projectId={projectId}
        milestone={milestoneToEdit}
      />

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={!!milestoneToDelete}
        onClose={() => setMilestoneToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Milestone"
        isLoading={deleteMilestoneMutation.isPending}
      />
    </div>
  );
}

export default function ProjectDetailsPage() {

  const updateProjectMutation = useUpdateProject();


const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setActiveProject = useTaskStore((state) => state.setActiveProject);
  const selectedTaskId = useTaskStore(state => state.selectedTaskId);
  const setSelectedTaskId = useTaskStore(state => state.setSelectedTaskId);
  const queryClient = useQueryClient();

  const taskQuery = useQuery({
    queryKey: ["task", selectedTaskId],
    queryFn: () => getTask(selectedTaskId!),
    enabled: !!selectedTaskId,
  });

  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isCreateMilestoneOpen, setIsCreateMilestoneOpen] = useState(false);
  const [deleteModalState, setDeleteModalState] = useState<{
    open: boolean;
    memberId: string | number | null;
    memberName: string;
  }>({ open: false, memberId: null, memberName: "" });

  const {
    data: project,
    isLoading: isProjectLoading,
    refetch: refetchProject,
  } = useProject(id || "");
  const { data: members = [], refetch: refetchMembers } = useProjectMembers(id || "");
  const { data: milestones = [], refetch: refetchMilestones } = useProjectMilestones(id || "");
  const { data: activities = [], refetch: refetchActivities } = useProjectActivities(id || "");

  const removeMemberMutation = useRemoveProjectMember(id || "");

  useEffect(() => {
    if (id) {
      refetchProject();
      refetchMembers();
      refetchMilestones();
      refetchActivities();
    }
  }, [id, refetchProject, refetchMembers, refetchMilestones, refetchActivities]);

  const handleOpenTasksBoard = () => {
    if (id) {
      setActiveProject(id);
      navigate("/tasks");
    }
  };

  const handleConfirmDeleteMember = () => {
    if (deleteModalState.memberId && id) {
      removeMemberMutation.mutate(deleteModalState.memberId, {
        onSuccess: () => {
          toast.success("Member removed successfully.");
          setDeleteModalState({ open: false, memberId: null, memberName: "" });
          refetchMembers();
          refetchProject();
        },
        onError: () => {
          toast.error("Could not remove member.");
        },
      });
    }
  };

  if (isProjectLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <span className="loading loading-spinner loading-md text-primary"></span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-2xl border border-dashed border-base-content/15 bg-base-100 p-12 text-center">
        <p className="text-base font-semibold text-base-content">Project not found</p>
        <button
          onClick={() => navigate("/projects")}
          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-primary-content"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  const rawColor = project.color || DEFAULT_COLOR;
  const themeColor = rawColor.startsWith("#") ? rawColor : DEFAULT_COLOR;
  const progress = project.progress_percentage || 0;

  const getProjectOwnerName = () => {
    if (project.owner) {
      const fullName =
        `${project.owner.first_name || ""} ${project.owner.last_name || ""}`.trim();
      if (fullName) return fullName;
      if (project.owner.username) return project.owner.username;
      if (project.owner.email) return project.owner.email;
    }
    return "Project Admin";
  };

  const ownerName = getProjectOwnerName();

  return (
    <div key={id} className="space-y-5 pb-10">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-base-content/8 pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/projects")}
            className="flex size-8.5 shrink-0 items-center justify-center rounded-xl border border-base-content/10 bg-base-100 text-base-content/60 transition hover:bg-base-200 hover:text-base-content"
            aria-label="Back to projects"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              {project.prefix && (
                <span
                  className="rounded-lg px-2 py-0.5 text-[10px] font-bold text-white"
                  style={{ background: themeColor }}
                >
                  {project.prefix}
                </span>
              )}
              <h1 dir="auto" className="text-xl font-bold tracking-tight text-base-content sm:text-2xl">
                {project.name}
              </h1>
              <StatusDropdown
                currentStatus={project.status}
                onChange={(s) => {
                  if (!project) return;
                  updateProjectMutation.mutate({ id: project.id, data: { status: s as any } }, {
                    onSuccess: () => toast.success("Project status updated."),
                    onError: () => toast.error("Failed to update status.")
                  });
                }}
                disabled={updateProjectMutation.isPending}
              />
            </div>
            {project.description && (
              <p dir="auto" className="mt-0.5 text-xs text-base-content/50 line-clamp-1">
                {project.description}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenTasksBoard}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-bold text-primary-content shadow-md shadow-primary/15 hover:bg-primary/90 transition-all self-start sm:self-auto"
        >
          <TaskSquare size={15} />
          <span>Open Tasks Board</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-base-content/8 bg-base-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === tab.id
                ? "bg-primary text-primary-content shadow-xs"
                : "text-base-content/55 hover:bg-base-200 hover:text-base-content"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-base-content/8 bg-base-100 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">
                    Budget
                  </p>
                  <p className="mt-1 text-sm font-bold text-base-content truncate">
                    {project.budget
                      ? `${Number(project.budget).toLocaleString()} ${project.budget_currency || "IRR"}`
                      : "—"}
                  </p>
                </div>
                <div className="rounded-2xl border border-base-content/8 bg-base-100 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">
                    Deadline
                  </p>
                  <p className="mt-1 text-sm font-bold text-base-content truncate">
                    {formatDate(project.deadline) ?? "No deadline"}
                  </p>
                </div>
                <div className="rounded-2xl border border-base-content/8 bg-base-100 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">
                    Progress
                  </p>
                  <p className="mt-1 text-sm font-bold text-primary">
                    {progress}%
                  </p>
                </div>
                <div className="rounded-2xl border border-base-content/8 bg-base-100 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">
                    Tasks
                  </p>
                  <p className="mt-1 text-sm font-bold text-base-content">
                    {project.task_count || 0}
                  </p>
                </div>
              </div>

              {/* Two Column Section: Milestones & Team */}
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Milestones */}
                <div className="rounded-2xl border border-base-content/8 bg-base-100 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-base-content uppercase tracking-wider">
                      Upcoming Milestones
                    </h3>
                    <button
                      onClick={() => setActiveTab("milestones")}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      View all ({milestones.length})
                    </button>
                  </div>

                  {milestones.length === 0 ? (
                    <p className="py-6 text-center text-xs text-base-content/40">
                      No milestones defined yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {milestones.slice(0, 3).map((ms: Milestone) => {
                        const msCfg = milestoneStatusConfig[ms.status] ?? milestoneStatusConfig.pending;
                        return (
                          <div
                            key={ms.id}
                            className="flex items-center justify-between rounded-xl border border-base-content/6 bg-base-200/40 px-3 py-2 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Flag size={14} className="shrink-0 text-primary" />
                              <span dir="auto" className="font-semibold text-base-content truncate">
                                {ms.title}
                              </span>
                            </div>
                            <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${msCfg.cls}`}>
                              {msCfg.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Team */}
                <div className="rounded-2xl border border-base-content/8 bg-base-100 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-base-content uppercase tracking-wider">
                      Team Members
                    </h3>
                    <button
                      onClick={() => setActiveTab("members")}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Manage ({members.length})
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-2.5">
                    <div className="grid size-7 place-items-center rounded-lg bg-primary text-white text-xs font-bold">
                      <Crown size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-base-content truncate">{ownerName}</p>
                      <p className="text-[10px] font-semibold text-primary">Project Owner</p>
                    </div>
                  </div>

                  {members.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {members.slice(0, 4).map((m: ProjectMember) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-2 rounded-xl border border-base-content/6 bg-base-200/40 p-2 text-xs"
                        >
                          <div className="grid size-6 place-items-center rounded-md bg-primary/10 text-[10px] font-bold text-primary shrink-0">
                            {getUserDisplayName(m)[0]?.toUpperCase() || "U"}
                          </div>
                          <span dir="auto" className="font-semibold text-base-content truncate text-[11px]">
                            {getUserDisplayName(m)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── MEMBERS TAB ── */}
          {activeTab === "members" && (
            <div className="rounded-2xl border border-base-content/8 bg-base-100 p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-base-content/8 pb-3">
                <h3 className="text-sm font-bold text-base-content">
                  Project Members &amp; Teams ({members.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(true)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-content"
                >
                  <Add size={14} /> Add Member
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {/* Owner Card */}
                <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="grid size-8 place-items-center rounded-lg bg-primary text-white text-xs font-bold shrink-0">
                      <Crown size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-base-content truncate">{ownerName}</p>
                      <p className="text-[10px] font-semibold text-primary">Owner</p>
                    </div>
                  </div>
                </div>

                {/* Assigned Users & Teams */}
                {members.map((m: ProjectMember) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl border border-base-content/8 bg-base-200/40 p-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
                        {m.team ? <People size={15} /> : getUserDisplayName(m)[0]?.toUpperCase() || "U"}
                      </div>
                      <div className="min-w-0">
                        <p dir="auto" className="text-xs font-bold text-base-content truncate">
                          {getUserDisplayName(m)}
                        </p>
                        <p className="text-[10px] font-medium text-base-content/40 truncate">
                          {m.specialty || (m.team ? "Team Squad" : "Member")}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteModalState({
                          open: true,
                          memberId: m.id,
                          memberName: getUserDisplayName(m),
                        })
                      }
                      className="grid size-6 place-items-center rounded-lg text-red-500 hover:bg-red-500/10 transition-all shrink-0"
                      aria-label="Remove member"
                    >
                      <Trash size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── MILESTONES TAB ── */}
          {activeTab === "milestones" && (
            <MilestonesTab
              milestones={milestones}
              projectId={id || ""}
              project={project}
              onCreateMilestone={() => setIsCreateMilestoneOpen(true)}
            />
          )}

          {/* ── ACTIVITY TAB ── */}
          {activeTab === "activity" && (
            <div className="rounded-2xl border border-base-content/8 bg-base-100 p-5 space-y-4">
              <h3 className="text-sm font-bold text-base-content border-b border-base-content/8 pb-3">
                Activity Feed
              </h3>
              {activities.length === 0 ? (
                <p className="py-8 text-center text-xs text-base-content/40">
                  No recent activity logged for this project.
                </p>
              ) : (
                <div className="space-y-2">
                  {activities.map((act: ProjectActivity) => {
                    const actorName =
                      act.actor?.full_name || act.actor?.username || "System";
                    return (
                      <div
                        key={act.id}
                        className="flex items-center justify-between rounded-xl border border-base-content/5 bg-base-200/30 px-3.5 py-2.5 text-xs"
                      >
                        <p className="font-medium text-base-content/80 truncate">
                          <span className="font-bold text-primary">{actorName}</span>
                          {" "}
                          {(act as any).event_type_display || act.event_type}
                        </p>
                        <span className="shrink-0 text-[10px] font-semibold text-base-content/40 ms-2">
                          {formatDate(act.created_at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {/* ── ANALYTICS TAB ── */}
          {activeTab === "analytics" && (
            <div className="space-y-5">
              <CumulativeFlowChart projectId={id || ""} />
              <CycleLeadTimeReport projectId={id || ""} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        projectId={id || ""}
        orgId={
          project?.organization
            ? String(
                typeof project.organization === "object"
                  ? (project.organization as any).id
                  : project.organization
              )
            : undefined
        }
      />
      <CreateMilestoneModal
        isOpen={isCreateMilestoneOpen}
        onClose={() => setIsCreateMilestoneOpen(false)}
        projectId={id || ""}
      />
      <DeleteConfirmModal
        isOpen={deleteModalState.open}
        onClose={() =>
          setDeleteModalState({ open: false, memberId: null, memberName: "" })
        }
        onConfirm={handleConfirmDeleteMember}
        isLoading={removeMemberMutation.isPending}
        title={deleteModalState.memberName}
      />

      <TaskSheet
        task={taskQuery.data ?? null}
        onClose={() => setSelectedTaskId(null)}
        onPatch={async (taskId, patch) => {
          await updateTask(taskId, patch);
          queryClient.invalidateQueries({ queryKey: ["unlinked-tasks", id] });
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
        }}
      />
    </div>
  );
}
