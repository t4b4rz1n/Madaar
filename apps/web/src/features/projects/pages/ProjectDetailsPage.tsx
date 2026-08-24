import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Briefcase,
  People,
  TaskSquare,
  Activity,
  Calendar,
  MoneyRecive,
  Add,
  Clock,
  Trash,
  Crown,
  Flag,
  TickCircle,
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
  active:    "bg-emerald-500/12 text-emerald-600",
  draft:     "bg-base-200 text-base-content/65",
  on_hold:   "bg-amber-500/12 text-amber-600",
  completed: "bg-blue-500/12 text-blue-600",
  archived:  "bg-red-500/10 text-red-500",
};

const milestoneStatusConfig: Record<string, { label: string; cls: string }> = {
  pending:     { label: "Pending",     cls: "bg-base-200 text-base-content/55" },
  in_progress: { label: "In Progress", cls: "bg-blue-500/12 text-blue-600" },
  completed:   { label: "Done",        cls: "bg-emerald-500/12 text-emerald-600" },
  cancelled:   { label: "Cancelled",   cls: "bg-red-500/10 text-red-500" },
};

const eventTypeIcon: Record<string, { icon: string; color: string }> = {
  created:    { icon: "✦", color: "#6366f1" },
  updated:    { icon: "✎", color: "#3b82f6" },
  deleted:    { icon: "✕", color: "#ef4444" },
  completed:  { icon: "✓", color: "#10b981" },
  archived:   { icon: "⌂", color: "#f59e0b" },
  member_added:   { icon: "+", color: "#8b5cf6" },
  member_removed: { icon: "−", color: "#ec4899" },
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
  { id: "overview",   label: "Overview",    icon: <Briefcase size={16} /> },
  { id: "members",    label: "Members",     icon: <People size={16} /> },
  { id: "milestones", label: "Milestones",  icon: <Flag size={16} /> },
  { id: "activity",   label: "Activity",    icon: <Activity size={16} /> },
];

export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setActiveProject = useTaskStore((state) => state.setActiveProject);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const tabsRef = useRef<Record<string, HTMLButtonElement | null>>({});

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
        onError: (err: any) => {
          toast.error("Could not remove member.");
          console.error(err);
        },
      });
    }
  };

  if (isProjectLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-[28px] border border-dashed border-base-content/15 bg-base-100 px-6 py-16 text-center">
        <p className="text-lg font-semibold text-base-content">Project not found!</p>
        <button onClick={() => navigate("/projects")} className="btn btn-primary mt-4 rounded-xl">
          Back to Projects List
        </button>
      </div>
    );
  }

  const color = project.color || DEFAULT_COLOR;
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
  const userMembers = members.filter((m) => m.user);
  const teamMembers = members.filter((m) => m.team);

  return (
    <div key={id} className="space-y-6 pb-10">
      {/* Hero Header */}
      <div
        className="relative overflow-hidden rounded-2xl border border-base-content/10 bg-base-100 shadow-sm"
        style={{
          background: `linear-gradient(135deg, ${color}14 0%, ${color}05 40%, transparent 70%)`,
          borderColor: `${color}25`,
        }}
      >
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-10 blur-3xl"
          style={{ background: color }}
        />
        <div
          className="pointer-events-none absolute -bottom-8 right-32 size-32 rounded-full opacity-8 blur-2xl"
          style={{ background: color }}
        />

        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: back + title */}
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate("/projects")}
              className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-xl border border-base-content/12 bg-base-100/60 text-base-content/60 backdrop-blur-sm transition hover:bg-base-100 hover:text-base-content"
              aria-label="Back to projects"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {project.prefix && (
                  <span
                    className="rounded-lg px-2.5 py-0.5 text-xs font-bold text-white"
                    style={{ background: color }}
                  >
                    {project.prefix}
                  </span>
                )}
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${
                    statusStyles[project.status] || statusStyles.draft
                  }`}
                >
                  {project.status.replace("_", " ")}
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-base-content sm:text-3xl">
                {project.name}
              </h1>
              <p className="mt-1 max-w-xl text-sm text-base-content/55">
                {project.description || "No description provided."}
              </p>

              {/* Progress bar */}
              <div className="mt-4 flex items-center gap-3">
                <div className="h-2 w-48 max-w-full overflow-hidden rounded-full bg-base-200">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${progress}%`, background: color }}
                  />
                </div>
                <span className="text-xs font-bold" style={{ color }}>
                  {progress}%
                </span>
              </div>
            </div>
          </div>

          {/* Right: CTA */}
          <button
            type="button"
            onClick={handleOpenTasksBoard}
            className="flex shrink-0 items-center gap-2 self-start rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90 active:scale-95"
            style={{ background: color, boxShadow: `0 4px 16px ${color}40` }}
          >
            <TaskSquare size={17} />
            Open Tasks Board
          </button>
        </div>

        {/* Mini stats strip */}
        <div
          className="flex divide-x border-t px-6 py-3"
          style={{ borderColor: `${color}18`, divideBorderColor: `${color}18` }}
        >
          {[
            { label: "Tasks", value: project.task_count ?? 0 },
            { label: "Members", value: (project.member_count ?? project.members_count) ?? 0 },
            { label: "Milestones", value: project.milestone_count ?? milestones.length },
            { label: "Deadline", value: formatDate(project.deadline) ?? "—" },
          ].map((s) => (
            <div key={s.label} className="flex-1 px-4 first:pl-0 last:pr-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40">
                {s.label}
              </p>
              <p className="mt-0.5 text-sm font-bold text-base-content">
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="relative border-b border-base-content/10">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              ref={(el) => { tabsRef.current[tab.id] = el; }}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? "text-base-content"
                  : "text-base-content/50 hover:text-base-content/80"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "members" && members.length > 0 && (
                <span className="rounded-full bg-base-200 px-1.5 py-0.5 text-[10px] font-bold text-base-content/55">
                  {members.length}
                </span>
              )}
              {tab.id === "milestones" && milestones.length > 0 && (
                <span className="rounded-full bg-base-200 px-1.5 py-0.5 text-[10px] font-bold text-base-content/55">
                  {milestones.length}
                </span>
              )}
            </button>
          ))}
        </div>
        {/* Animated underline */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            layoutId="tab-indicator"
            className="absolute bottom-0 h-0.5 rounded-full"
            style={{ background: color }}
            initial={false}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            // Manually position under active tab
            animate={{
              width: tabsRef.current[activeTab]?.offsetWidth ?? 80,
              x: tabsRef.current[activeTab]?.offsetLeft ?? 0,
            }}
          />
        </AnimatePresence>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {/* ─── OVERVIEW ─── */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Budget */}
                <div className="flex items-center gap-4 rounded-2xl border border-base-content/10 bg-base-100 p-5 shadow-sm">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <MoneyRecive size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40">
                      Budget
                    </p>
                    <p className="mt-1 truncate text-base font-bold text-base-content">
                      {project.budget
                        ? `${Number(project.budget).toLocaleString()} ${project.budget_currency || "IRR"}`
                        : "Not specified"}
                    </p>
                  </div>
                </div>

                {/* Deadline */}
                <div className="flex items-center gap-4 rounded-2xl border border-base-content/10 bg-base-100 p-5 shadow-sm">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-600">
                    <Calendar size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40">
                      Deadline
                    </p>
                    <p className="mt-1 truncate text-base font-bold text-base-content">
                      {formatDate(project.deadline) ?? "No deadline"}
                    </p>
                  </div>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-4 rounded-2xl border border-base-content/10 bg-base-100 p-5 shadow-sm">
                  <div
                    className="relative grid size-11 shrink-0 place-items-center rounded-xl"
                    style={{ background: `${color}15` }}
                  >
                    <TaskSquare size={22} style={{ color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40">
                        Progress
                      </p>
                      <span className="text-sm font-bold" style={{ color }}>{progress}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-base-200">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${progress}%`, background: color }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-base-content/40">
                      {project.task_count || 0} total tasks
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Upcoming milestones */}
                <div className="space-y-4 rounded-2xl border border-base-content/10 bg-base-100 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-base-content">
                      <Clock size={16} style={{ color }} /> Upcoming Milestones
                    </h3>
                    <button
                      onClick={() => setActiveTab("milestones")}
                      className="text-xs font-semibold hover:underline"
                      style={{ color }}
                    >
                      View all ({milestones.length})
                    </button>
                  </div>

                  {milestones.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-base-content/10 py-6 text-center text-xs text-base-content/40">
                      No milestones defined yet.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {milestones.slice(0, 3).map((ms: Milestone) => {
                        const msCfg = milestoneStatusConfig[ms.status] ?? milestoneStatusConfig.pending;
                        return (
                          <div
                            key={ms.id}
                            className="flex items-center gap-3 rounded-xl border border-base-content/5 bg-base-200/40 p-3"
                          >
                            <div
                              className="grid size-7 shrink-0 place-items-center rounded-lg"
                              style={{ background: `${color}20` }}
                            >
                              {ms.status === "completed" ? (
                                <TickCircle size={14} style={{ color }} />
                              ) : (
                                <Flag size={14} style={{ color }} />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-base-content">
                                {ms.title}
                              </p>
                              <p className="mt-0.5 text-[11px] text-base-content/45">
                                {formatDate(ms.target_date)}
                              </p>
                            </div>
                            <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${msCfg.cls}`}>
                              {msCfg.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Assigned members */}
                <div className="space-y-4 rounded-2xl border border-base-content/10 bg-base-100 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-base-content">
                      <People size={16} style={{ color }} /> Team
                    </h3>
                    <button
                      onClick={() => setActiveTab("members")}
                      className="text-xs font-semibold hover:underline"
                      style={{ color }}
                    >
                      Manage ({members.length})
                    </button>
                  </div>

                  {/* Owner */}
                  <div
                    className="flex items-center gap-3 rounded-xl p-3"
                    style={{ background: `${color}10`, border: `1px solid ${color}20` }}
                  >
                    <div
                      className="grid size-8 place-items-center rounded-lg font-bold text-white text-xs"
                      style={{ background: color }}
                    >
                      <Crown size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-base-content">{ownerName}</p>
                      <p className="text-[11px] font-medium" style={{ color }}>Project Owner</p>
                    </div>
                  </div>

                  {members.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-base-content/10 py-4 text-center text-xs text-base-content/40">
                      No additional members assigned yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {members.slice(0, 6).map((m: ProjectMember) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-2.5 rounded-xl border border-base-content/5 bg-base-200/40 p-2.5"
                        >
                          <div
                            className="grid size-7 place-items-center rounded-lg text-[10px] font-bold text-white"
                            style={{ background: color }}
                          >
                            {m.team ? (
                              <People size={12} />
                            ) : (
                              getUserDisplayName(m)[0]?.toUpperCase() || "U"
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-semibold text-base-content">
                              {getUserDisplayName(m)}
                            </p>
                            <p className="truncate text-[10px] text-base-content/45">
                              {m.specialty || (m.team ? "Team" : "Member")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── MEMBERS ─── */}
          {activeTab === "members" && (
            <div className="rounded-2xl border border-base-content/10 bg-base-100 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-base-content/10 pb-4">
                <div>
                  <h3 className="text-base font-bold text-base-content">Project Members & Teams</h3>
                  <p className="mt-0.5 text-xs text-base-content/45">
                    Manage users and team squads assigned to this project.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(true)}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-md"
                  style={{ background: color, boxShadow: `0 4px 12px ${color}35` }}
                >
                  <Add size={15} /> Add Member / Team
                </button>
              </div>

              {/* Owner */}
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-base-content/40">
                  Project Owner
                </p>
                <div
                  className="flex items-center gap-4 rounded-xl p-4"
                  style={{ background: `${color}10`, border: `1px solid ${color}25` }}
                >
                  <div
                    className="grid size-10 place-items-center rounded-xl font-bold text-white"
                    style={{ background: color }}
                  >
                    <Crown size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-base-content">{ownerName}</p>
                    <p className="mt-0.5 text-xs font-medium" style={{ color }}>
                      Owner & Project Creator
                    </p>
                  </div>
                  <span
                    className="ms-auto rounded-lg px-2.5 py-1 text-[11px] font-bold text-white"
                    style={{ background: color }}
                  >
                    Owner
                  </span>
                </div>
              </div>

              {/* Individual users */}
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-base-content/40">
                  Assigned Users ({userMembers.length})
                </p>
                {userMembers.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-base-content/10 py-6 text-center text-xs text-base-content/40">
                    No individual users assigned yet.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {userMembers.map((m: ProjectMember) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-xl border border-base-content/5 bg-base-200/50 p-3.5"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="grid size-9 place-items-center rounded-xl font-bold text-white"
                            style={{ background: color }}
                          >
                            {getUserDisplayName(m)[0]?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-base-content">
                              {getUserDisplayName(m)}
                            </p>
                            <p className="mt-0.5 text-[11px] text-base-content/50">
                              {m.specialty || "General Member"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-base-200 px-2 py-1 text-[11px] font-bold text-base-content/60">
                            {m.allocation_percentage}%
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteModalState({
                                open: true,
                                memberId: m.id,
                                memberName: getUserDisplayName(m),
                              })
                            }
                            className="grid size-7 place-items-center rounded-lg text-red-500 hover:bg-red-50"
                            aria-label="Remove member"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Teams */}
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-base-content/40">
                  Assigned Teams ({teamMembers.length})
                </p>
                {teamMembers.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-base-content/10 py-6 text-center text-xs text-base-content/40">
                    No team squads assigned yet.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {teamMembers.map((m: ProjectMember) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-xl border border-blue-500/12 bg-blue-500/5 p-3.5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="grid size-9 place-items-center rounded-xl bg-blue-500/20 text-blue-600">
                            <People size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-base-content">
                              {m.team?.name || "Team Squad"}
                            </p>
                            <p className="mt-0.5 text-[11px] text-blue-500">
                              {m.specialty || "Full Squad Team"}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteModalState({
                              open: true,
                              memberId: m.id,
                              memberName: m.team?.name || "Team Squad",
                            })
                          }
                          className="grid size-7 place-items-center rounded-lg text-red-500 hover:bg-red-50"
                          aria-label="Remove team"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── MILESTONES ─── */}
          {activeTab === "milestones" && (
            <div className="rounded-2xl border border-base-content/10 bg-base-100 p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-base-content">Project Milestones</h3>
                  <p className="mt-0.5 text-xs text-base-content/45">
                    Key goals and delivery target dates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateMilestoneOpen(true)}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-md"
                  style={{ background: color, boxShadow: `0 4px 12px ${color}35` }}
                >
                  <Add size={15} /> Create Milestone
                </button>
              </div>

              {milestones.length === 0 ? (
                <p className="rounded-xl border border-dashed border-base-content/10 py-10 text-center text-sm text-base-content/40">
                  No milestones added to this project yet.
                </p>
              ) : (
                <div className="relative space-y-0">
                  {/* Timeline line */}
                  <div className="absolute left-[19px] top-6 bottom-6 w-0.5 rounded-full bg-base-200" />
                  {milestones.map((ms: Milestone, idx: number) => {
                    const msCfg = milestoneStatusConfig[ms.status] ?? milestoneStatusConfig.pending;
                    return (
                      <div key={ms.id} className="relative flex gap-4 pb-4">
                        {/* Timeline dot */}
                        <div
                          className={`relative z-10 mt-3 grid size-10 shrink-0 place-items-center rounded-xl border-2 border-base-100 ${
                            ms.status === "completed"
                              ? "bg-emerald-500 text-white"
                              : ms.status === "in_progress"
                              ? "text-white"
                              : "bg-base-200 text-base-content/40"
                          }`}
                          style={
                            ms.status === "in_progress"
                              ? { background: color }
                              : undefined
                          }
                        >
                          <span className="text-xs font-bold">{idx + 1}</span>
                        </div>
                        <div className="flex-1 rounded-xl border border-base-content/5 bg-base-200/40 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-base-content">{ms.title}</p>
                              {ms.description && (
                                <p className="mt-1 text-xs text-base-content/55">{ms.description}</p>
                              )}
                              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-base-content/40">
                                <Calendar size={12} />
                                Target: {formatDate(ms.target_date)}
                              </p>
                            </div>
                            <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold ${msCfg.cls}`}>
                              {msCfg.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── ACTIVITY ─── */}
          {activeTab === "activity" && (
            <div className="rounded-2xl border border-base-content/10 bg-base-100 p-6 shadow-sm">
              <h3 className="mb-5 text-base font-bold text-base-content">Activity Feed</h3>
              {activities.length === 0 ? (
                <p className="rounded-xl border border-dashed border-base-content/10 py-10 text-center text-sm text-base-content/40">
                  No recent activity logged for this project.
                </p>
              ) : (
                <div className="space-y-2">
                  {activities.map((act: ProjectActivity) => {
                    const evKey = act.event_type?.toLowerCase().replace(/\s/g, "_");
                    const evConfig = eventTypeIcon[evKey] || { icon: "•", color };
                    const actorName =
                      act.actor?.full_name || act.actor?.username || "System";
                    return (
                      <div
                        key={act.id}
                        className="flex items-center gap-3 rounded-xl border border-base-content/5 bg-base-200/40 p-3.5"
                      >
                        <div
                          className="grid size-8 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
                          style={{ background: evConfig.color }}
                        >
                          {evConfig.icon}
                        </div>
                        <p className="flex-1 text-xs font-medium text-base-content">
                          <span className="font-bold text-primary">{actorName}</span>
                          {" "}
                          {(act as any).event_type_display || act.event_type}
                        </p>
                        <span className="shrink-0 text-[11px] font-medium text-base-content/35">
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
