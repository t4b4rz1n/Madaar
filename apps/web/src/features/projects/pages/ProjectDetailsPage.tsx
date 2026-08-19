import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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

const statusStyles: Record<string, string> = {
  active: "bg-success/12 text-success",
  draft: "bg-base-200 text-base-content/65",
  on_hold: "bg-warning/15 text-warning",
  completed: "bg-info/12 text-info",
  archived: "bg-error/10 text-error",
};

const getUserDisplayName = (member: ProjectMember) => {
  if (member.team) return member.team.name;
  if (!member.user) return "Member";

  const fullName =
    `${member.user.first_name || ""} ${member.user.last_name || ""}`.trim();
  if (fullName) return fullName;

  return member.user.username || member.user.email || "User";
};

export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setActiveProject = useTaskStore((state) => state.setActiveProject);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Modals States
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
  const { data: members = [], refetch: refetchMembers } = useProjectMembers(
    id || "",
  );
  const { data: milestones = [], refetch: refetchMilestones } =
    useProjectMilestones(id || "");
  const { data: activities = [], refetch: refetchActivities } =
    useProjectActivities(id || "");

  const removeMemberMutation = useRemoveProjectMember(id || "");

  useEffect(() => {
    if (id) {
      refetchProject();
      refetchMembers();
      refetchMilestones();
      refetchActivities();
    }
  }, [
    id,
    refetchProject,
    refetchMembers,
    refetchMilestones,
    refetchActivities,
  ]);

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
          console.error("Delete Member Error:", err?.response?.data || err);
          toast.error("Could not remove member.");
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
      <div className="madaar-surface rounded-[28px] border border-dashed border-base-content/15 bg-base-100 px-6 py-16 text-center">
        <p className="text-lg font-semibold text-base-content">
          Project not found!
        </p>
        <button
          onClick={() => navigate("/projects")}
          className="btn btn-primary mt-4 rounded-xl"
        >
          Back to Projects List
        </button>
      </div>
    );
  }

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
      {/* Header & Back Button */}
      <div className="madaar-surface flex flex-col justify-between gap-4 rounded-2xl border border-base-content/10 bg-base-100 p-6 shadow-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/projects")}
            className="btn btn-ghost btn-circle rounded-xl border border-base-content/10"
            aria-label="Back to projects"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="badge badge-primary font-mono text-xs font-semibold rounded-lg px-2.5 py-1">
                {project.prefix || "PRJ"}
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">
                {project.name}
              </h1>
            </div>
            <p className="mt-1 text-sm text-base-content/60">
              {project.description || "No description provided."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold capitalize ${
              statusStyles[project.status] || statusStyles.draft
            }`}
          >
            {project.status.replace("_", " ")}
          </span>

          <button
            type="button"
            onClick={handleOpenTasksBoard}
            className="btn btn-primary gap-2 rounded-xl shadow-md shadow-primary/15"
          >
            <TaskSquare size={18} />
            <span>Open Tasks Board</span>
          </button>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex gap-2 overflow-x-auto border-b border-base-content/10 pb-1">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === "overview"
              ? "bg-primary/10 text-primary"
              : "text-base-content/60 hover:bg-base-200/60 hover:text-base-content"
          }`}
        >
          <Briefcase size={18} />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === "members"
              ? "bg-primary/10 text-primary"
              : "text-base-content/60 hover:bg-base-200/60 hover:text-base-content"
          }`}
        >
          <People size={18} />
          <span>Members ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("milestones")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === "milestones"
              ? "bg-primary/10 text-primary"
              : "text-base-content/60 hover:bg-base-200/60 hover:text-base-content"
          }`}
        >
          <Flag size={18} />
          <span>Milestones ({milestones.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("activity")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === "activity"
              ? "bg-primary/10 text-primary"
              : "text-base-content/60 hover:bg-base-200/60 hover:text-base-content"
          }`}
        >
          <Activity size={18} />
          <span>Activities ({activities.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-6"
      >
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="madaar-surface flex items-center gap-4 rounded-2xl border border-base-content/10 bg-base-100 p-5">
                <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <MoneyRecive size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-base-content/45">
                    Total Budget
                  </p>
                  <p className="mt-1 truncate text-lg font-bold tracking-tight text-base-content">
                    {project.budget
                      ? `${Number(project.budget).toLocaleString()} ${
                          project.budget_currency || "IRR"
                        }`
                      : "Not specified"}
                  </p>
                </div>
              </div>

              <div className="madaar-surface flex items-center gap-4 rounded-2xl border border-base-content/10 bg-base-100 p-5">
                <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-info/10 text-info">
                  <Calendar size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-base-content/45">
                    Deadline
                  </p>
                  <p className="mt-1 truncate text-lg font-bold tracking-tight text-base-content">
                    {project.deadline
                      ? new Intl.DateTimeFormat("en", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }).format(new Date(project.deadline))
                      : "No deadline"}
                  </p>
                </div>
              </div>

              <div className="madaar-surface flex items-center gap-4 rounded-2xl border border-base-content/10 bg-base-100 p-5">
                <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-success/10 text-success">
                  <TaskSquare size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex justify-between text-xs font-semibold text-base-content/60">
                    <span>Overall Progress</span>
                    <span>{project.progress_percentage || 0}%</span>
                  </div>
                  <progress
                    className="progress progress-success h-2 w-full bg-base-200"
                    value={project.progress_percentage || 0}
                    max="100"
                  />
                  <span className="mt-1 block text-[11px] text-base-content/45">
                    {project.task_count || 0} Total Tasks
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="madaar-surface space-y-4 rounded-2xl border border-base-content/10 bg-base-100 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-base font-bold text-base-content">
                    <Clock size={18} className="text-primary" /> Upcoming
                    Milestones
                  </h3>
                  <button
                    onClick={() => setActiveTab("milestones")}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View All ({milestones.length})
                  </button>
                </div>

                {milestones.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-base-content/10 py-4 text-center text-xs text-base-content/50">
                    No milestones defined yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {milestones.slice(0, 3).map((ms: Milestone) => (
                      <div
                        key={ms.id}
                        className="flex items-center justify-between rounded-xl border border-base-content/5 bg-base-200/40 p-3"
                      >
                        <div>
                          <p className="text-xs font-semibold text-base-content">
                            {ms.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-base-content/50">
                            Target:{" "}
                            {new Intl.DateTimeFormat("en", {
                              month: "short",
                              day: "numeric",
                            }).format(new Date(ms.target_date))}
                          </p>
                        </div>
                        <span className="badge badge-sm font-semibold capitalize">
                          {ms.status.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="madaar-surface space-y-4 rounded-2xl border border-base-content/10 bg-base-100 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-base font-bold text-base-content">
                    <People size={18} className="text-primary" /> Assigned
                    Members
                  </h3>
                  <button
                    onClick={() => setActiveTab("members")}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Manage ({members.length})
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 p-2.5">
                    <div className="grid size-8 place-items-center rounded-lg bg-primary/20 text-xs font-bold text-primary">
                      <Crown size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-base-content">
                        {ownerName}
                      </p>
                      <p className="truncate text-[11px] font-medium text-primary">
                        Project Owner (Creator)
                      </p>
                    </div>
                  </div>

                  {members.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-base-content/10 py-3 text-center text-xs text-base-content/50">
                      No additional members assigned yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {members.slice(0, 4).map((m: ProjectMember) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-3 rounded-xl border border-base-content/5 bg-base-200/40 p-2.5"
                        >
                          <div className="grid size-8 place-items-center rounded-lg bg-primary/20 text-xs font-bold text-primary">
                            {getUserDisplayName(m)[0]?.toUpperCase() || "U"}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-base-content">
                              {getUserDisplayName(m)}
                            </p>
                            <p className="truncate text-[11px] text-base-content/50">
                              {m.specialty ||
                                (m.team ? "Team Squad" : "General")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === "members" && (
          <div className="madaar-surface space-y-6 rounded-2xl border border-base-content/10 bg-base-100 p-6">
            <div className="flex items-center justify-between border-b border-base-content/10 pb-4">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-base-content">
                  Project Members & Teams
                </h3>
                <p className="mt-0.5 text-xs text-base-content/50">
                  Manage users and team squads assigned to this project.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(true)}
                className="btn btn-primary btn-sm gap-2 rounded-xl shadow-md shadow-primary/15"
              >
                <Add size={16} /> Add Member / Team
              </button>
            </div>

            {/* ۱. بخش مالک پروژه */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-base-content/45">
                Project Owner
              </p>
              <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-primary/20 font-bold text-primary">
                    <Crown size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-base-content">
                      {ownerName}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-primary">
                      Owner & Project Creator
                    </p>
                  </div>
                </div>
                <span className="badge badge-primary rounded-lg text-xs font-semibold">
                  Owner
                </span>
              </div>
            </div>

            {/* ۲. بخش اعضای فردی (Assigned Users) */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-base-content/45">
                Assigned Users ({userMembers.length})
              </p>
              {userMembers.length === 0 ? (
                <p className="rounded-xl border border-dashed border-base-content/10 py-6 text-center text-xs text-base-content/50">
                  No individual users assigned yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {userMembers.map((m: ProjectMember) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-xl border border-base-content/5 bg-base-200/50 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-xl bg-primary/20 font-bold text-primary">
                          {getUserDisplayName(m)[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-base-content">
                            {getUserDisplayName(m)}
                          </p>
                          <p className="mt-0.5 text-xs text-base-content/60">
                            {m.specialty || "General Member"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="badge badge-neutral rounded-lg text-xs font-medium">
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
                          className="btn btn-ghost btn-square btn-xs rounded-lg text-error"
                          aria-label="Remove member"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ۳. بخش تیم‌ها (Assigned Teams) */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-base-content/45">
                Assigned Teams & Squads ({teamMembers.length})
              </p>
              {teamMembers.length === 0 ? (
                <p className="rounded-xl border border-dashed border-base-content/10 py-6 text-center text-xs text-base-content/50">
                  No team squads assigned to this project yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {teamMembers.map((m: ProjectMember) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-xl border border-info/15 bg-info/5 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-xl bg-info/20 font-bold text-info">
                          <People size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-base-content">
                            {m.team?.name || "Team Squad"}
                          </p>
                          <p className="mt-0.5 text-xs text-info">
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
                        className="btn btn-ghost btn-square btn-xs rounded-lg text-error"
                        aria-label="Remove team squad"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Milestones Tab */}
        {activeTab === "milestones" && (
          <div className="madaar-surface space-y-4 rounded-2xl border border-base-content/10 bg-base-100 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-base-content">
                  Project Milestones
                </h3>
                <p className="mt-0.5 text-xs text-base-content/50">
                  Key goals and delivery target dates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateMilestoneOpen(true)}
                className="btn btn-primary btn-sm gap-2 rounded-xl shadow-md shadow-primary/15"
              >
                <Add size={16} /> Create Milestone
              </button>
            </div>

            {milestones.length === 0 ? (
              <p className="rounded-xl border border-dashed border-base-content/10 py-8 text-center text-sm text-base-content/50">
                No milestones added to this project yet.
              </p>
            ) : (
              <div className="space-y-3">
                {milestones.map((ms: Milestone) => (
                  <div
                    key={ms.id}
                    className="flex items-center justify-between rounded-xl border border-base-content/5 bg-base-200/50 p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-base-content">
                        {ms.title}
                      </p>
                      {ms.description && (
                        <p className="mt-0.5 text-xs text-base-content/60">
                          {ms.description}
                        </p>
                      )}
                      <p className="mt-1 flex items-center gap-1 text-xs text-base-content/45">
                        <Calendar size={13} /> Target:{" "}
                        {new Intl.DateTimeFormat("en", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }).format(new Date(ms.target_date))}
                      </p>
                    </div>
                    <span
                      className={`badge text-xs font-bold capitalize ${
                        ms.status === "completed"
                          ? "badge-success"
                          : ms.status === "in_progress"
                            ? "badge-info"
                            : "badge-ghost"
                      }`}
                    >
                      {ms.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <div className="madaar-surface space-y-4 rounded-2xl border border-base-content/10 bg-base-100 p-6">
            <h3 className="mb-4 text-lg font-bold tracking-tight text-base-content">
              Activity Feed
            </h3>
            {activities.length === 0 ? (
              <p className="rounded-xl border border-dashed border-base-content/10 py-8 text-center text-sm text-base-content/50">
                No recent activity logged for this project.
              </p>
            ) : (
              <div className="space-y-3">
                {activities.map((act: ProjectActivity) => (
                  <div
                    key={act.id}
                    className="flex items-center gap-3 rounded-xl border border-base-content/5 bg-base-200/40 p-3.5 text-xs"
                  >
                    <div className="size-2 shrink-0 rounded-full bg-primary"></div>
                    <p className="font-medium text-base-content">
                      <span className="font-bold text-primary">
                        {act.actor?.full_name ||
                          act.actor?.username ||
                          "System"}
                      </span>
                      : {(act as any).event_type_display || act.event_type}
                    </p>
                    <span className="ms-auto text-base-content/40">
                      {new Intl.DateTimeFormat("en", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }).format(new Date(act.created_at))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        projectId={id || ""}
      />

      {/* Create Milestone Modal */}
      <CreateMilestoneModal
        isOpen={isCreateMilestoneOpen}
        onClose={() => setIsCreateMilestoneOpen(false)}
        projectId={id || ""}
      />

      {/* Custom Delete Confirmation Modal */}
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
