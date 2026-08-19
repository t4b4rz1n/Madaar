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
} from "iconsax-reactjs";
import {
  useProject,
  useProjectMembers,
  useProjectMilestones,
  useProjectActivities,
} from "../hooks/useProjects";
import type { ProjectMember, Milestone, ProjectActivity } from "../types";
import { useTaskStore } from "../../tasks/store/useTaskStore";

type TabType = "overview" | "members" | "milestones" | "activity";

const statusStyles: Record<string, string> = {
  active: "bg-success/12 text-success",
  draft: "bg-base-200 text-base-content/65",
  on_hold: "bg-warning/15 text-warning",
  completed: "bg-info/12 text-info",
  archived: "bg-error/10 text-error",
};

export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setActiveProject = useTaskStore((state) => state.setActiveProject);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // دریافت refetch ها از کیوئری‌ها
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

  // 💡 این بخش جادویی مشکل رو حل می‌کنه:
  // به محض اینکه آدرس URL عوض بشه و id تغییر کنه، حتماً تمام دیتای این صفحه بدون نیاز به رفرش بازخوانی میشن!
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
          className="btn btn-primary rounded-xl mt-4"
        >
          Back to Projects List
        </button>
      </div>
    );
  }

  return (
    <div key={id} className="space-y-6 pb-10">
      {/* Header & Back Button */}
      <div className="madaar-surface flex flex-col justify-between gap-4 rounded-2xl border border-base-content/10 bg-base-100 p-6 shadow-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/projects")}
            className="btn btn-ghost btn-circle border border-base-content/10 rounded-xl"
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
            className="btn btn-primary rounded-xl gap-2 shadow-md shadow-primary/15"
          >
            <TaskSquare size={18} />
            <span>Open Tasks Board</span>
          </button>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex overflow-x-auto gap-2 border-b border-base-content/10 pb-1">
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
          <TaskSquare size={18} />
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
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="madaar-surface rounded-2xl border border-base-content/10 bg-base-100 p-5 flex items-center gap-4">
                <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                  <MoneyRecive size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-base-content/45">
                    Total Budget
                  </p>
                  <p className="mt-1 text-lg font-bold tracking-tight text-base-content truncate">
                    {project.budget
                      ? `${Number(project.budget).toLocaleString()} ${
                          project.budget_currency || "IRR"
                        }`
                      : "Not specified"}
                  </p>
                </div>
              </div>

              <div className="madaar-surface rounded-2xl border border-base-content/10 bg-base-100 p-5 flex items-center gap-4">
                <div className="grid size-12 place-items-center rounded-xl bg-info/10 text-info shrink-0">
                  <Calendar size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-base-content/45">
                    Deadline
                  </p>
                  <p className="mt-1 text-lg font-bold tracking-tight text-base-content truncate">
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

              <div className="madaar-surface rounded-2xl border border-base-content/10 bg-base-100 p-5 flex items-center gap-4">
                <div className="grid size-12 place-items-center rounded-xl bg-success/10 text-success shrink-0">
                  <TaskSquare size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs font-semibold text-base-content/60 mb-1">
                    <span>Overall Progress</span>
                    <span>{project.progress_percentage || 0}%</span>
                  </div>
                  <progress
                    className="progress progress-success w-full h-2 bg-base-200"
                    value={project.progress_percentage || 0}
                    max="100"
                  />
                  <span className="text-[11px] text-base-content/45 mt-1 block">
                    {project.task_count || 0} Total Tasks
                  </span>
                </div>
              </div>
            </div>

            {/* Overview Bottom Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Recent Milestones Preview */}
              <div className="madaar-surface rounded-2xl border border-base-content/10 bg-base-100 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-base-content flex items-center gap-2">
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
                  <p className="text-xs text-base-content/50 py-4 text-center border border-dashed border-base-content/10 rounded-xl">
                    No milestones defined yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {milestones.slice(0, 3).map((ms: Milestone) => (
                      <div
                        key={ms.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-base-200/40 border border-base-content/5"
                      >
                        <div>
                          <p className="font-semibold text-xs text-base-content">
                            {ms.title}
                          </p>
                          <p className="text-[11px] text-base-content/50 mt-0.5">
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

              {/* Members Preview */}
              <div className="madaar-surface rounded-2xl border border-base-content/10 bg-base-100 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-base-content flex items-center gap-2">
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

                {members.length === 0 ? (
                  <p className="text-xs text-base-content/50 py-4 text-center border border-dashed border-base-content/10 rounded-xl">
                    No members assigned to this project yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {members.slice(0, 4).map((m: ProjectMember) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-base-200/40 border border-base-content/5"
                      >
                        <div className="grid size-8 place-items-center rounded-lg bg-primary/20 text-primary font-bold text-xs">
                          {m.user?.first_name?.[0] || "U"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-base-content truncate">
                            {m.user
                              ? `${m.user.first_name || ""} ${m.user.last_name || ""}`.trim()
                              : "Member"}
                          </p>
                          <p className="text-[11px] text-base-content/50 truncate">
                            {m.specialty || "General"}
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

        {/* Members Tab */}
        {activeTab === "members" && (
          <div className="madaar-surface rounded-2xl border border-base-content/10 bg-base-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold tracking-tight text-base-content">
                Project Members
              </h3>
              <button className="btn btn-primary btn-sm rounded-xl gap-2 shadow-md shadow-primary/15">
                <Add size={16} /> Add Member
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {members.map((m: ProjectMember) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-base-200/50 border border-base-content/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-xl bg-primary/20 text-primary font-bold">
                      {m.user?.first_name?.[0] || "U"}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-base-content">
                        {m.user
                          ? `${m.user.first_name || ""} ${m.user.last_name || ""}`.trim()
                          : "Member"}
                      </p>
                      <p className="text-xs text-base-content/60 mt-0.5">
                        {m.specialty || "General"}
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-neutral text-xs font-medium rounded-lg">
                    Allocation: {m.allocation_percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Milestones Tab */}
        {activeTab === "milestones" && (
          <div className="madaar-surface rounded-2xl border border-base-content/10 bg-base-100 p-6 space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold tracking-tight text-base-content">
                Project Milestones
              </h3>
              <button className="btn btn-primary btn-sm rounded-xl gap-2 shadow-md shadow-primary/15">
                <Add size={16} /> Create Milestone
              </button>
            </div>
            {milestones.map((ms: Milestone) => (
              <div
                key={ms.id}
                className="flex items-center justify-between p-4 rounded-xl bg-base-200/50 border border-base-content/5"
              >
                <div>
                  <p className="font-semibold text-sm text-base-content">
                    {ms.title}
                  </p>
                  <p className="text-xs text-base-content/60 mt-1">
                    Target:{" "}
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

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <div className="madaar-surface rounded-2xl border border-base-content/10 bg-base-100 p-6 space-y-4">
            <h3 className="text-lg font-bold tracking-tight text-base-content mb-4">
              Activity Feed
            </h3>
            <div className="space-y-3">
              {activities.map((act: ProjectActivity) => (
                <div
                  key={act.id}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-base-200/40 text-xs border border-base-content/5"
                >
                  <div className="size-2 rounded-full bg-primary shrink-0"></div>
                  <p className="font-medium text-base-content">
                    {act.actor?.first_name || "System"}: {act.event_type}
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
          </div>
        )}
      </motion.div>
    </div>
  );
}
