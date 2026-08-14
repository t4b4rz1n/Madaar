import { useState } from "react";
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
} from "iconsax-reactjs";
import {
  useProject,
  useProjectMembers,
  useProjectMilestones,
  useProjectActivities,
} from "../hooks/useProjects";
import type { ProjectMember, Milestone, ProjectActivity } from "../types";

type TabType = "overview" | "members" | "milestones" | "activity";

export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const { data: projectResponse, isLoading: isProjectLoading } = useProject(
    id || "",
  );
  const { data: membersResponse } = useProjectMembers(id || "");
  const { data: milestonesResponse } = useProjectMilestones(id || "");
  const { data: activitiesResponse } = useProjectActivities(id || "");

  // Extract actual data from ApiResponse
  const project = projectResponse?.data;

  const members: ProjectMember[] = Array.isArray(membersResponse?.data)
    ? membersResponse.data
    : (membersResponse?.data as unknown as { results: ProjectMember[] })
        ?.results || [];

  const milestones: Milestone[] = Array.isArray(milestonesResponse?.data)
    ? milestonesResponse.data
    : (milestonesResponse?.data as unknown as { results: Milestone[] })
        ?.results || [];

  const activities: ProjectActivity[] = Array.isArray(activitiesResponse?.data)
    ? activitiesResponse.data
    : (activitiesResponse?.data as unknown as { results: ProjectActivity[] })
        ?.results || [];

  if (isProjectLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20 text-base-content/60">
        <p className="text-lg font-medium">Project not found!</p>
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
    <div className="space-y-6">
      {/* Header & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-100 p-6 rounded-2xl border border-base-content/10 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/projects")}
            className="btn btn-ghost btn-circle border border-base-content/10"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="badge badge-primary font-mono text-xs">
                {project.prefix || "PRJ"}
              </span>
              <h1 className="text-2xl font-bold text-base-content">
                {project.name}
              </h1>
            </div>
            <p className="text-sm text-base-content/60 mt-1">
              {project.description || "No description provided."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge badge-outline capitalize p-3 font-semibold">
            {project.status}
          </span>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-base-content/10 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === "overview"
              ? "border-primary text-primary"
              : "border-transparent text-base-content/60 hover:text-base-content"
          }`}
        >
          <Briefcase size={18} />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === "members"
              ? "border-primary text-primary"
              : "border-transparent text-base-content/60 hover:text-base-content"
          }`}
        >
          <People size={18} />
          <span>Members ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("milestones")}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === "milestones"
              ? "border-primary text-primary"
              : "border-transparent text-base-content/60 hover:text-base-content"
          }`}
        >
          <TaskSquare size={18} />
          <span>Milestones ({milestones.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("activity")}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === "activity"
              ? "border-primary text-primary"
              : "border-transparent text-base-content/60 hover:text-base-content"
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
      >
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-base-100 p-5 rounded-2xl border border-base-content/10 flex items-center gap-4">
              <div className="p-3 bg-primary/10 text-primary rounded-xl">
                <MoneyRecive size={24} />
              </div>
              <div>
                <p className="text-xs text-base-content/60">Total Budget</p>
                <p className="text-lg font-bold">
                  {project.budget
                    ? `${project.budget.toLocaleString()} ${project.budget_currency || "IRR"}`
                    : "Not specified"}
                </p>
              </div>
            </div>

            <div className="bg-base-100 p-5 rounded-2xl border border-base-content/10 flex items-center gap-4">
              <div className="p-3 bg-info/10 text-info rounded-xl">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-xs text-base-content/60">Deadline</p>
                <p className="text-lg font-bold">
                  {project.deadline
                    ? new Date(project.deadline).toLocaleDateString("en-US")
                    : "No deadline"}
                </p>
              </div>
            </div>

            <div className="bg-base-100 p-5 rounded-2xl border border-base-content/10 flex items-center gap-4">
              <div className="p-3 bg-success/10 text-success rounded-xl">
                <TaskSquare size={24} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs text-base-content/60 mb-1">
                  <span>Overall Progress</span>
                  <span>{project.progress_percentage || 0}%</span>
                </div>
                <progress
                  className="progress progress-success w-full h-2"
                  value={project.progress_percentage || 0}
                  max="100"
                />
              </div>
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === "members" && (
          <div className="bg-base-100 p-6 rounded-2xl border border-base-content/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Project Members</h3>
              <button className="btn btn-primary btn-sm rounded-xl gap-2">
                <Add size={16} /> Add Member
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {members.map((m: ProjectMember) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-4 bg-base-200/50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                      {m.user?.first_name?.[0] || "U"}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">
                        {m.user
                          ? `${m.user.first_name} ${m.user.last_name}`
                          : "Member"}
                      </p>
                      <p className="text-xs text-base-content/60">
                        {m.specialty || "General"}
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-neutral text-xs">
                    Allocation: {m.allocation_percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Milestones Tab */}
        {activeTab === "milestones" && (
          <div className="bg-base-100 p-6 rounded-2xl border border-base-content/10 space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Project Milestones</h3>
              <button className="btn btn-primary btn-sm rounded-xl gap-2">
                <Add size={16} /> Create Milestone
              </button>
            </div>
            {milestones.map((ms: Milestone) => (
              <div
                key={ms.id}
                className="flex items-center justify-between p-4 bg-base-200/50 rounded-xl border border-base-content/5"
              >
                <div>
                  <p className="font-semibold text-sm">{ms.title}</p>
                  <p className="text-xs text-base-content/60">
                    Target:{" "}
                    {new Date(ms.target_date).toLocaleDateString("en-US")}
                  </p>
                </div>
                <span
                  className={`badge ${
                    ms.status === "completed"
                      ? "badge-success"
                      : ms.status === "in_progress"
                        ? "badge-info"
                        : "badge-ghost"
                  }`}
                >
                  {ms.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <div className="bg-base-100 p-6 rounded-2xl border border-base-content/10 space-y-4">
            <h3 className="text-lg font-bold mb-4">Activity Feed</h3>
            <div className="space-y-3">
              {activities.map((act: ProjectActivity) => (
                <div
                  key={act.id}
                  className="flex items-center gap-3 p-3 bg-base-200/30 rounded-xl text-xs"
                >
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <p className="font-medium">
                    {act.actor?.first_name || "System"}: {act.event_type}
                  </p>
                  <span className="ms-auto text-base-content/40">
                    {new Date(act.created_at).toLocaleDateString("en-US")}
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
