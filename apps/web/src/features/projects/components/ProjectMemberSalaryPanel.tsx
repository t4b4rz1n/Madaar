import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DollarCircle, Edit2, RefreshCircle, TickCircle, CloseCircle } from "iconsax-reactjs";
import { updateProjectMemberSalary, resetProjectMemberSalary } from "../api/projectsApi";
import type { ProjectMember } from "../types";

interface ProjectMemberSalaryPanelProps {
  projectId: string | number;
  members: ProjectMember[];
}

interface EditState {
  memberId: string | number;
  salaryType: "monthly" | "hourly" | "";
  salaryAmount: string;
}

const formatSalary = (type?: string | null, amount?: string | null) => {
  if (!amount) return "—";
  const num = parseFloat(amount);
  if (isNaN(num)) return "—";
  const formatted = num.toLocaleString();
  return type === "hourly" ? `${formatted} / hr` : `${formatted} / mo`;
};

export const ProjectMemberSalaryPanel = ({
  projectId,
  members,
}: ProjectMemberSalaryPanelProps) => {
  const queryClient = useQueryClient();
  const [editState, setEditState] = useState<EditState | null>(null);

  const updateSalaryMutation = useMutation({
    mutationFn: ({
      memberId,
      data,
    }: {
      memberId: string | number;
      data: { salary_type?: "monthly" | "hourly" | null; salary_amount?: string | null };
    }) => updateProjectMemberSalary(projectId, memberId, data),
    onSuccess: () => {
      toast.success("Project salary updated");
      queryClient.invalidateQueries({ queryKey: ["project-members", String(projectId)] });
      setEditState(null);
    },
    onError: () => toast.error("Failed to update salary"),
  });

  const resetSalaryMutation = useMutation({
    mutationFn: (memberId: string | number) =>
      resetProjectMemberSalary(projectId, memberId),
    onSuccess: () => {
      toast.success("Salary reset to organization level");
      queryClient.invalidateQueries({ queryKey: ["project-members", String(projectId)] });
    },
    onError: () => toast.error("Failed to reset salary"),
  });

  const userMembers = members.filter((m) => m.user);

  const handleEdit = (member: ProjectMember) => {
    setEditState({
      memberId: member.id,
      salaryType: (member.salary_type as "monthly" | "hourly") || "",
      salaryAmount: member.salary_amount ?? "",
    });
  };

  const handleSave = () => {
    if (!editState) return;
    updateSalaryMutation.mutate({
      memberId: editState.memberId,
      data: {
        salary_type: editState.salaryType || null,
        salary_amount: editState.salaryAmount || null,
      },
    });
  };

  const handleCancel = () => setEditState(null);

  if (userMembers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-xs text-base-content/40">
        <DollarCircle size={28} className="opacity-30" />
        <p>No user members in this project</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-1">
      {userMembers.map((member) => {
        const displayName =
          `${member.user?.first_name || ""} ${member.user?.last_name || ""}`.trim() ||
          member.user?.username ||
          member.user?.email ||
          "User";
        const initials = displayName[0]?.toUpperCase() || "U";
        const isEditing = editState?.memberId === member.id;
        const isOverride = member.salary_override === true;

        return (
          <div
            key={member.id}
            className="rounded-xl border border-base-content/8 bg-base-200/30 p-3 text-xs transition-all hover:border-base-content/12"
          >
            {/* Member header */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary text-[10px] font-bold">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p dir="auto" className="font-bold text-base-content truncate">
                    {displayName}
                  </p>
                  {member.user?.email && (
                    <p className="text-[10px] text-base-content/40 truncate">
                      {member.user.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Badge + action buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isOverride ? (
                  <span className="rounded-md bg-amber-500/12 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    Project Override
                  </span>
                ) : (
                  <span className="rounded-md bg-base-300/60 px-2 py-0.5 text-[10px] font-medium text-base-content/40">
                    From Org
                  </span>
                )}
                {!isEditing && (
                  <button
                    onClick={() => handleEdit(member)}
                    className="p-1 rounded-md text-base-content/40 hover:text-primary hover:bg-base-200 transition-all"
                    title="Edit project salary"
                  >
                    <Edit2 size={13} />
                  </button>
                )}
                {isOverride && !isEditing && (
                  <button
                    onClick={() => resetSalaryMutation.mutate(member.id)}
                    disabled={resetSalaryMutation.isPending}
                    className="p-1 rounded-md text-base-content/40 hover:text-warning hover:bg-base-200 transition-all"
                    title="Reset to org salary"
                  >
                    <RefreshCircle size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Salary display or edit form */}
            {isEditing ? (
              <div className="flex flex-col gap-2 mt-1 pt-2 border-t border-base-content/8">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={editState.salaryType}
                    onChange={(e) =>
                      setEditState((s) =>
                        s ? { ...s, salaryType: e.target.value as "monthly" | "hourly" | "" } : null
                      )
                    }
                    className="h-8 rounded-lg border border-base-content/10 bg-base-100 px-2 text-[11px] font-semibold text-base-content outline-none focus:border-primary/40 transition-all"
                  >
                    <option value="">No salary</option>
                    <option value="monthly">Monthly</option>
                    <option value="hourly">Hourly</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editState.salaryAmount}
                    onChange={(e) =>
                      setEditState((s) =>
                        s ? { ...s, salaryAmount: e.target.value } : null
                      )
                    }
                    placeholder="Amount"
                    className="h-8 rounded-lg border border-base-content/10 bg-base-100 px-2 text-[11px] font-semibold text-base-content outline-none focus:border-primary/40 transition-all placeholder:text-base-content/30"
                  />
                </div>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  ⚠ This overrides org-level salary for this project only.
                </p>
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={handleCancel}
                    className="h-7 px-3 rounded-lg border border-base-content/10 text-[11px] font-bold text-base-content/60 hover:bg-base-200 transition-all inline-flex items-center gap-1"
                  >
                    <CloseCircle size={12} />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={updateSalaryMutation.isPending}
                    className="h-7 px-3 rounded-lg bg-primary text-[11px] font-bold text-primary-content hover:bg-primary/90 transition-all inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <TickCircle size={12} />
                    {updateSalaryMutation.isPending ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1 pt-1.5 border-t border-base-content/6">
                <DollarCircle size={13} className="text-base-content/30 shrink-0" />
                <span className="font-bold text-base-content/70">
                  {formatSalary(member.salary_type, member.salary_amount)}
                </span>
                {member.salary_type && (
                  <span className="text-[10px] text-base-content/40 capitalize">
                    ({member.salary_type})
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
