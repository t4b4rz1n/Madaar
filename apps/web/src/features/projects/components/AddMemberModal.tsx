import React, { useState } from "react";
import { CloseCircle, User, People } from "iconsax-reactjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAddProjectMember } from "../hooks/useProjects";
import { getUsers } from "../../users/api/usersApi";
import { teamsApi } from "../../teams/api/teamsApi";
import { toast } from "sonner";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | number;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  projectId,
}) => {
  const queryClient = useQueryClient();
  const addMemberMutation = useAddProjectMember(projectId);
  const [memberType, setMemberType] = useState<"user" | "team">("user");

  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [allocation, setAllocation] = useState(100);

  // ۱. دریافت لیست کاربران
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => getUsers(new URLSearchParams({ page_size: "100" })),
    enabled: isOpen && memberType === "user",
  });

  // ۲. دریافت لیست تیم‌ها
  const { data: teamsData, isLoading: isLoadingTeams } = useQuery({
    queryKey: ["teams-list"],
    queryFn: () => teamsApi.getTeams({ page_size: 100 }),
    enabled: isOpen && memberType === "team",
  });

  const users =
    usersData?.data?.results ||
    (Array.isArray(usersData?.data) ? usersData.data : []);
  const teams =
    teamsData?.data?.results ||
    (Array.isArray(teamsData?.data) ? teamsData.data : []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (memberType === "user" && !selectedUserId) {
      toast.error("Please select a user.");
      return;
    }
    if (memberType === "team" && !selectedTeamId) {
      toast.error("Please select a team.");
      return;
    }

    const payload: any = {
      specialty: specialty || undefined,
      allocation_percentage: Number(allocation),
    };

    if (memberType === "user") {
      payload.user_id = selectedUserId;
    } else {
      payload.team_id = selectedTeamId;
    }

    addMemberMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(
          memberType === "user"
            ? "User added to project successfully!"
            : "Team added to project successfully!"
        );
        // به روزرسانی آنی لیست پروژه‌ها و جزئیات پروژه برای تغییر عدد کارت
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        onClose();
        setSelectedUserId("");
        setSelectedTeamId("");
        setSpecialty("");
        setAllocation(100);
      },
      onError: (err: any) => {
        const responseData = err?.data || err?.response?.data || err;
        console.log("SERVER ERROR RESPONSE:", responseData);

        let errorMsg = "Could not add member to project.";

        if (typeof responseData === "object" && responseData !== null) {
          errorMsg =
            responseData.user_id?.[0] ||
            responseData.team_id?.[0] ||
            responseData.non_field_errors?.[0] ||
            responseData.detail ||
            responseData.message ||
            errorMsg;
        }

        toast.error(String(errorMsg));
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="madaar-surface w-full max-w-lg rounded-[28px] border border-base-content/10 bg-base-100 p-6 shadow-2xl animate-in fade-in zoom-in duration-200 sm:p-7"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-content/10 pb-4">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-base-content">
              Add Member to Project
            </h3>
            <p className="mt-0.5 text-xs text-base-content/55">
              Assign an individual team member or an entire team squad.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-base-content/50 hover:bg-base-200 hover:text-base-content"
          >
            <CloseCircle size={22} />
          </button>
        </div>

        {/* Member Type Selector (Tabs) */}
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-base-200/60 p-1">
          <button
            type="button"
            onClick={() => setMemberType("user")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
              memberType === "user"
                ? "bg-base-100 text-primary shadow-xs"
                : "text-base-content/60 hover:text-base-content"
            }`}
          >
            <User size={16} /> Individual User
          </button>
          <button
            type="button"
            onClick={() => setMemberType("team")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
              memberType === "team"
                ? "bg-base-100 text-primary shadow-xs"
                : "text-base-content/60 hover:text-base-content"
            }`}
          >
            <People size={16} /> Entire Team
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {memberType === "user" ? (
            <div>
              <label className="mb-2 block text-xs font-medium text-base-content">
                Select User <span className="text-error">*</span>
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
                disabled={isLoadingUsers}
                className="select select-bordered w-full rounded-xl bg-base-200/60"
              >
                <option value="" className="bg-base-100 text-base-content">
                  {isLoadingUsers
                    ? "Loading users..."
                    : users.length === 0
                      ? "No users found"
                      : "-- Choose User --"}
                </option>
                {users.map((u: any) => (
                  <option
                    key={u.id}
                    value={u.id}
                    className="bg-base-100 text-base-content"
                  >
                    {u.first_name || u.last_name
                      ? `${u.first_name || ""} ${u.last_name || ""}`.trim()
                      : u.username || u.email}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-xs font-medium text-base-content">
                Select Team Squad <span className="text-error">*</span>
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                required
                disabled={isLoadingTeams}
                className="select select-bordered w-full rounded-xl bg-base-200/60"
              >
                <option value="" className="bg-base-100 text-base-content">
                  {isLoadingTeams
                    ? "Loading teams..."
                    : teams.length === 0
                      ? "No teams found"
                      : "-- Choose Team --"}
                </option>
                {teams.map((t: any) => (
                  <option
                    key={t.id}
                    value={t.id}
                    className="bg-base-100 text-base-content"
                  >
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-medium text-base-content">
              Specialty / Role in Project
            </label>
            <input
              type="text"
              placeholder="e.g. Frontend Developer, QA Engineer"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="input input-bordered w-full rounded-xl bg-base-200/60"
            />
          </div>

          <div>
            <div className="mb-2 flex justify-between text-xs font-medium text-base-content">
              <span>Allocation Percentage</span>
              <span className="font-bold text-primary">{allocation}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="10"
              value={allocation}
              onChange={(e) => setAllocation(Number(e.target.value))}
              className="range range-primary range-xs w-full"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-base-content/10 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addMemberMutation.isPending}
              className="btn btn-primary rounded-xl px-6"
            >
              {addMemberMutation.isPending ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "Add to Project"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
