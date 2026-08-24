import React, { useState, useRef, useEffect } from "react";
import {
  CloseCircle,
  User,
  People,
  UserAdd,
  SearchNormal1,
  ArrowDown2,
  TickCircle,
} from "iconsax-reactjs";
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

  // Search & Dropdown states
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => getUsers(new URLSearchParams({ page_size: "100" })),
    enabled: isOpen && memberType === "user",
  });

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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset selection when tab switches
  const handleTypeChange = (type: "user" | "team") => {
    setMemberType(type);
    setSelectedUserId("");
    setSelectedTeamId("");
    setSearchQuery("");
    setIsDropdownOpen(false);
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter((u: any) => {
    const name =
      `${u.first_name || ""} ${u.last_name || ""} ${u.username || ""} ${u.email || ""}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const filteredTeams = teams.filter((t: any) =>
    (t.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (memberType === "user" && !selectedUserId) {
      toast.error("Please select a user from the dropdown.");
      return;
    }
    if (memberType === "team" && !selectedTeamId) {
      toast.error("Please select a team squad from the dropdown.");
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
            ? "User added to project successfully"
            : "Team added to project successfully"
        );
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        onClose();
        setSelectedUserId("");
        setSelectedTeamId("");
        setSearchQuery("");
        setSpecialty("");
        setAllocation(100);
      },
      onError: (err: any) => {
        const responseData = err?.data || err?.response?.data || err;
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
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-base-content/10 bg-base-100 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header with theme gradient */}
        <div className="relative flex items-center justify-between px-6 py-4.5 bg-gradient-to-r from-primary/90 to-primary text-primary-content">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-2xl bg-white/20 backdrop-blur-xs">
              <UserAdd size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                Add Project Member
              </h3>
              <p className="text-[11px] text-primary-content/80 font-medium">
                Search and assign users or team squads
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-primary-content/80 hover:bg-white/20 hover:text-primary-content transition duration-150"
          >
            <CloseCircle size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Member Type Selector */}
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-base-content/8 bg-base-200/50 p-1">
            <button
              type="button"
              onClick={() => handleTypeChange("user")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
                memberType === "user"
                  ? "bg-primary text-primary-content shadow-xs"
                  : "text-base-content/60 hover:text-base-content"
              }`}
            >
              <User size={14} /> Individual User
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("team")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
                memberType === "team"
                  ? "bg-primary text-primary-content shadow-xs"
                  : "text-base-content/60 hover:text-base-content"
              }`}
            >
              <People size={14} /> Team Squad
            </button>
          </div>

          {/* Searchable Select Combobox */}
          <div ref={dropdownRef} className="relative">
            <label className="block font-bold text-base-content/60 mb-1 uppercase tracking-wider text-[11px]">
              {memberType === "user" ? "Search User" : "Search Team Squad"}{" "}
              <span className="text-error">*</span>
            </label>

            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40">
                <SearchNormal1 size={15} />
              </div>
              <input
                type="text"
                dir="auto"
                placeholder={
                  memberType === "user"
                    ? "Type user name, username, or email..."
                    : "Type team squad name..."
                }
                value={searchQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                  if (memberType === "user") setSelectedUserId("");
                  else setSelectedTeamId("");
                }}
                className="w-full h-10 rounded-xl border border-base-content/10 bg-base-200/50 pl-9 pr-9 font-semibold text-base-content outline-none focus:border-primary/40 focus:bg-base-100 transition-all placeholder:text-base-content/35"
              />
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-base-content/40 hover:text-base-content"
              >
                <ArrowDown2
                  size={14}
                  className={`transition-transform duration-200 ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {/* Dropdown Options Container */}
            {isDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-2xl border border-base-content/10 bg-base-100 p-1.5 shadow-xl backdrop-blur-md animate-in fade-in duration-100 space-y-0.5">
                {memberType === "user" ? (
                  isLoadingUsers ? (
                    <div className="p-3 text-center text-xs text-base-content/40">
                      Loading users...
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-3 text-center text-xs text-base-content/40">
                      No matching users found
                    </div>
                  ) : (
                    filteredUsers.map((u: any) => {
                      const displayName =
                        `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
                        u.username ||
                        u.email;
                      const isSelected = selectedUserId === String(u.id);

                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setSelectedUserId(String(u.id));
                            setSearchQuery(displayName);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-left transition-all ${
                            isSelected
                              ? "bg-primary/10 text-primary font-bold"
                              : "hover:bg-base-200/60 text-base-content font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary text-[10px] font-bold shrink-0">
                              {displayName[0]?.toUpperCase() || "U"}
                            </div>
                            <div className="min-w-0">
                              <p dir="auto" className="truncate text-xs font-bold">
                                {displayName}
                              </p>
                              {u.email && (
                                <p className="truncate text-[10px] text-base-content/40">
                                  {u.email}
                                </p>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <TickCircle size={15} className="shrink-0 text-primary" />
                          )}
                        </button>
                      );
                    })
                  )
                ) : isLoadingTeams ? (
                  <div className="p-3 text-center text-xs text-base-content/40">
                    Loading teams...
                  </div>
                ) : filteredTeams.length === 0 ? (
                  <div className="p-3 text-center text-xs text-base-content/40">
                    No matching teams found
                  </div>
                ) : (
                  filteredTeams.map((t: any) => {
                    const isSelected = selectedTeamId === String(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setSelectedTeamId(String(t.id));
                          setSearchQuery(t.name);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-left transition-all ${
                          isSelected
                            ? "bg-primary/10 text-primary font-bold"
                            : "hover:bg-base-200/60 text-base-content font-medium"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="grid size-7 place-items-center rounded-lg bg-blue-500/15 text-blue-600 text-[10px] font-bold shrink-0">
                            <People size={14} />
                          </div>
                          <span dir="auto" className="truncate text-xs font-bold">
                            {t.name}
                          </span>
                        </div>
                        {isSelected && (
                          <TickCircle size={15} className="shrink-0 text-primary" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-base-content/60 mb-1 uppercase tracking-wider text-[11px]">
              Role / Specialty
            </label>
            <input
              type="text"
              placeholder="e.g. Lead Engineer, UI Designer"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full h-9.5 rounded-xl border border-base-content/10 bg-base-200/50 px-3 font-semibold text-base-content outline-none focus:border-primary/40 focus:bg-base-100 transition-all placeholder:text-base-content/35"
            />
          </div>

          <div>
            <div className="flex items-center justify-between font-bold text-base-content/60 mb-1.5 uppercase tracking-wider text-[11px]">
              <span>Capacity Allocation</span>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                {allocation}%
              </span>
            </div>

            {/* Quick preset allocation pills */}
            <div className="flex items-center gap-1.5 mb-2">
              {[25, 50, 75, 100].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAllocation(val)}
                  className={`flex-1 rounded-lg py-1 text-[10px] font-bold transition-all ${
                    allocation === val
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-base-200/50 text-base-content/50 hover:bg-base-200 border border-transparent"
                  }`}
                >
                  {val}%
                </button>
              ))}
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

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-base-content/8">
            <button
              type="button"
              onClick={onClose}
              disabled={addMemberMutation.isPending}
              className="h-9 px-4 rounded-xl border border-base-content/10 text-xs font-bold text-base-content/70 hover:bg-base-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addMemberMutation.isPending}
              className="h-9 px-5 rounded-xl bg-primary text-xs font-bold text-primary-content shadow-md shadow-primary/15 hover:bg-primary/95 transition-all inline-flex items-center gap-1.5"
            >
              {addMemberMutation.isPending ? (
                <span>Adding...</span>
              ) : (
                <span>Add Member</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
