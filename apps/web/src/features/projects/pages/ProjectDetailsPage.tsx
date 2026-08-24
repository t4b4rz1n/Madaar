import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  People,
  TaskSquare,
  Activity,
  Add,
  Trash,
  Crown,
  Flag,
} from "iconsax-reactjs";
import {
  useProject,
  useProjectMembers,
  useProjectMilestones,
  useProjectActivities,
  useRemoveProjectMember,
} from "../hooks/useProjects";
import type { ProjectMember, Milestone, ProjectActivity } from "../types";
import { useTaskStore } from "../../tasks/store/useTaskStore";
import { AddMemberModal } from "../components/AddMemberModal";
import { CreateMilestoneModal } from "../components/CreateMilestoneModal";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { toast } from "sonner";

type TabType = "overview" | "members" | "milestones" | "activity";

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

const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
  { id: "overview",   label: "Overview",    icon: <TaskSquare size={15} /> },
  { id: "members",    label: "Members",     icon: <People size={15} /> },
  { id: "milestones", label: "Milestones",  icon: <Flag size={15} /> },
  { id: "activity",   label: "Activity",    icon: <Activity size={15} /> },
];

export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setActiveProject = useTaskStore((state) => state.setActiveProject);
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
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                  statusStyles[project.status] || statusStyles.draft
                }`}
              >
                {project.status.replace("_", " ")}
              </span>
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
            <div className="rounded-2xl border border-base-content/8 bg-base-100 p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-base-content/8 pb-3">
                <h3 className="text-sm font-bold text-base-content">
                  Project Milestones ({milestones.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreateMilestoneOpen(true)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-content"
                >
                  <Add size={14} /> New Milestone
                </button>
              </div>

              {milestones.length === 0 ? (
                <p className="py-8 text-center text-xs text-base-content/40">
                  No milestones added to this project yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {milestones.map((ms: Milestone) => {
                    const msCfg = milestoneStatusConfig[ms.status] ?? milestoneStatusConfig.pending;
                    return (
                      <div
                        key={ms.id}
                        className="flex items-center justify-between rounded-xl border border-base-content/6 bg-base-200/40 p-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Flag size={15} className="shrink-0 text-primary" />
                          <div className="min-w-0">
                            <p dir="auto" className="font-bold text-base-content truncate">
                              {ms.title}
                            </p>
                            {ms.target_date && (
                              <p className="text-[10px] text-base-content/45 mt-0.5">
                                Target: {formatDate(ms.target_date)}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-bold ${msCfg.cls}`}>
                          {msCfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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
        </motion.div>
      </AnimatePresence>

      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        projectId={id || ""}
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
    </div>
  );
}
