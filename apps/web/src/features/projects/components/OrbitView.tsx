import {
  ArrowLeft2,
  ArrowRight2,
  Calendar1,
  CloseCircle,
  Pause,
  People,
  Play,
  Refresh2,
  SearchZoomIn,
  SearchZoomOut,
} from "iconsax-reactjs";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { useMemo, useRef, useState, type PointerEvent } from "react";
import type { Milestone, Project, ProjectMember } from "../types";

interface OrbitViewProps {
  project: Project;
  members?: ProjectMember[];
  milestones?: Milestone[];
}

interface RingDefinition {
  id: string;
  label: string;
  size: number;
}

interface MemberCluster {
  label: string;
  members: ProjectMember[];
}

interface OrbitControlsProps {
  isPlaying: boolean;
  showPlayLabel?: boolean;
  onTogglePlaying: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onReset: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
}

const MIN_ZOOM = 0.72;
const MAX_ZOOM = 1.35;
const ZOOM_STEP = 0.12;
const MAX_RING_NODES = 8;
const VISIBLE_RING_MEMBERS = MAX_RING_NODES - 1;

const statusClasses: Record<Project["status"], string> = {
  active: "bg-success text-success-content",
  draft: "bg-base-100 text-base-content/70",
  on_hold: "bg-warning text-warning-content",
  completed: "bg-info text-info-content",
  archived: "bg-error text-error-content",
};

const clampZoom = (value: number) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

const getMemberName = (member: ProjectMember) => {
  if (member.team) return member.team.name;
  if (!member.user) return "Project member";

  const fullName = `${member.user.first_name ?? ""} ${member.user.last_name ?? ""}`.trim();
  return fullName || member.user.full_name || member.user.username || member.user.email || "Project member";
};

const getMemberRole = (member: ProjectMember) =>
  member.specialty || (member.team ? "Team" : "Member");

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "M";

const formatDeadline = (deadline?: string | null) => {
  if (!deadline) return "No deadline";
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return "No deadline";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

function OrbitControls({
  isPlaying,
  showPlayLabel = false,
  onTogglePlaying,
  onZoomOut,
  onZoomIn,
  onReset,
  onRotateLeft,
  onRotateRight,
}: OrbitControlsProps) {
  const buttonClassName =
    "grid size-9 shrink-0 place-items-center rounded-lg text-base-content/70 transition duration-150 hover:bg-base-200 hover:text-base-content active:scale-95";

  return (
    <div className="flex items-center gap-0.5 rounded-xl border border-base-content/10 bg-base-100/80 p-1 shadow-lg backdrop-blur-xl supports-[backdrop-filter]:bg-base-100/70">
      <button
        type="button"
        onClick={onTogglePlaying}
        className={showPlayLabel
          ? "inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-bold text-base-content/70 transition duration-150 hover:bg-base-200 hover:text-base-content active:scale-95"
          : buttonClassName}
        aria-label={isPlaying ? "Pause orbit animation" : "Play orbit animation"}
      >
        {isPlaying ? <Pause size={15} variant="Bold" /> : <Play size={15} variant="Bold" />}
        {showPlayLabel && <span>{isPlaying ? "Pause" : "Play"}</span>}
      </button>
      <button type="button" onClick={onZoomOut} className={buttonClassName} aria-label="Zoom out">
        <SearchZoomOut size={16} />
      </button>
      <button type="button" onClick={onZoomIn} className={buttonClassName} aria-label="Zoom in">
        <SearchZoomIn size={16} />
      </button>
      <button type="button" onClick={onReset} className={buttonClassName} aria-label="Reset orbit view">
        <Refresh2 size={16} />
      </button>
      <div className="flex border-s border-base-content/10 ps-0.5">
        <button type="button" onClick={onRotateLeft} className={buttonClassName} aria-label="Rotate orbit left">
          <ArrowLeft2 size={15} />
        </button>
        <button type="button" onClick={onRotateRight} className={buttonClassName} aria-label="Rotate orbit right">
          <ArrowRight2 size={15} />
        </button>
      </div>
    </div>
  );
}

function MemberDetails({
  member,
  onClose,
}: {
  member: ProjectMember;
  onClose: () => void;
}) {
  const name = getMemberName(member);
  const role = getMemberRole(member);

  return (
    <div className="relative p-5" dir="auto">
      <button
        type="button"
        onClick={onClose}
        className="absolute end-3 top-3 grid size-9 place-items-center rounded-xl text-base-content/45 transition hover:bg-base-200 hover:text-base-content"
        aria-label="Close member details"
      >
        <CloseCircle size={19} />
      </button>
      <div className="flex items-center gap-3 pe-9">
        <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-secondary text-sm font-black text-secondary-content shadow-lg shadow-secondary/20">
          {member.user?.avatar ? (
            <img src={member.user.avatar} alt="" className="size-full object-cover" />
          ) : (
            getInitials(name)
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-base-content">{name}</p>
          <span className="mt-1 inline-flex rounded-full bg-secondary/12 px-2 py-0.5 text-[10px] font-bold text-secondary">
            {role}
          </span>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl bg-base-200/65 p-3">
          <dt className="text-[10px] font-semibold text-base-content/45">Allocation</dt>
          <dd className="mt-1 font-bold text-base-content">{member.allocation_percentage}%</dd>
        </div>
        <div className="rounded-xl bg-base-200/65 p-3">
          <dt className="text-[10px] font-semibold text-base-content/45">Team</dt>
          <dd className="mt-1 truncate font-bold text-base-content">{member.team?.name || "Independent"}</dd>
        </div>
      </dl>
    </div>
  );
}

function ClusterDetails({
  cluster,
  onClose,
  onSelectMember,
}: {
  cluster: MemberCluster;
  onClose: () => void;
  onSelectMember: (member: ProjectMember) => void;
}) {
  return (
    <div className="relative p-5" dir="auto">
      <button
        type="button"
        onClick={onClose}
        className="absolute end-3 top-3 grid size-9 place-items-center rounded-xl text-base-content/45 transition hover:bg-base-200 hover:text-base-content"
        aria-label="Close remaining members"
      >
        <CloseCircle size={19} />
      </button>
      <div className="pe-10">
        <p className="truncate text-sm font-bold text-base-content">{cluster.label}</p>
        <p className="mt-1 text-xs font-medium text-base-content/55">
          {cluster.members.length} more {cluster.members.length === 1 ? "member" : "members"}
        </p>
      </div>
      <div className="mt-4 grid gap-2">
        {cluster.members.map((member) => {
          const name = getMemberName(member);
          const role = getMemberRole(member);

          return (
            <button
              key={member.id}
              type="button"
              onClick={() => onSelectMember(member)}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-base-content/8 bg-base-200/55 p-2.5 text-start transition hover:border-secondary/30 hover:bg-base-200 active:scale-[0.99]"
            >
              <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary text-[10px] font-black text-secondary-content">
                {member.user?.avatar ? (
                  <img src={member.user.avatar} alt="" className="size-full object-cover" />
                ) : member.team ? (
                  <People size={16} />
                ) : (
                  getInitials(name)
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-base-content">{name}</span>
                <span className="mt-0.5 block truncate text-[10px] font-medium text-base-content/55">{role}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function OrbitView({
  project,
  members = [],
  milestones = [],
}: OrbitViewProps) {
  const reduceMotion = useReducedMotion();
  const [isPlaying, setIsPlaying] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [filter, setFilter] = useState("all");
  const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<MemberCluster | null>(null);
  const activePointers = useRef(new Map<number, { x: number; y: number }>());
  const lastPinchDistance = useRef<number | null>(null);

  const teamNames = useMemo(
    () => Array.from(new Set(members.flatMap((member) => member.team?.name ? [member.team.name] : []))),
    [members],
  );

  const roleNames = useMemo(
    () => Array.from(new Set(members.map(getMemberRole))),
    [members],
  );

  const rings = useMemo<RingDefinition[]>(() => {
    const labels = teamNames.length > 0
      ? teamNames
      : milestones.length > 0
        ? milestones.map((milestone) => milestone.title)
        : ["Inner orbit", "Core team", "Outer orbit"];
    const visibleLabels = labels.slice(0, 4);
    const count = Math.max(1, visibleLabels.length);

    return visibleLabels.map((label, index) => ({
      id: `${label}-${index}`,
      label,
      size: count === 1 ? 72 : 48 + (index * 36) / (count - 1),
    }));
  }, [milestones, teamNames]);

  const visibleMembers = useMemo(() => {
    if (filter === "all") return members;
    const [kind, value] = filter.split(":", 2);
    return members.filter((member) =>
      kind === "team" ? member.team?.name === value : getMemberRole(member) === value,
    );
  }, [filter, members]);

  const memberRingIndex = (member: ProjectMember, index: number) => {
    if (member.team) {
      const matchingRing = rings.findIndex((ring) => ring.label === member.team?.name);
      if (matchingRing >= 0) return matchingRing;
    }
    return index % rings.length;
  };

  const updateZoom = (nextZoom: number) => setZoom(clampZoom(nextZoom));
  const resetView = () => {
    setZoom(1);
    setRotation(0);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[data-orbit-node], button, select")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const previous = activePointers.current.get(event.pointerId);
    if (!previous) return;

    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = Array.from(activePointers.current.values());

    if (points.length >= 2) {
      const [first, second] = points;
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      if (lastPinchDistance.current !== null) {
        updateZoom(zoom + (distance - lastPinchDistance.current) / 320);
      }
      lastPinchDistance.current = distance;
      return;
    }

    setRotation((current) => current + (event.clientX - previous.x) * 0.45);
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(event.pointerId);
    if (activePointers.current.size < 2) lastPinchDistance.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const progress = Math.min(100, Math.max(0, project.progress_percentage ?? 0));
  const statusLabel = project.status_display || project.status.replace("_", " ");
  const closePanels = () => {
    setSelectedMember(null);
    setSelectedCluster(null);
  };

  return (
    <section className="relative isolate h-[70vh] min-h-[460px] max-h-[640px] w-full overflow-hidden rounded-2xl border border-base-content/8 bg-base-100 shadow-sm md:h-[620px]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,color-mix(in_srgb,var(--color-warning)_18%,transparent),transparent_20%),radial-gradient(circle_at_50%_50%,color-mix(in_srgb,var(--color-secondary)_12%,transparent),transparent_56%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle,color-mix(in_srgb,var(--color-base-content)_18%,transparent)_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className="absolute start-4 top-4 z-30 hidden sm:block">
        <OrbitControls
          isPlaying={isPlaying}
          showPlayLabel
          onTogglePlaying={() => setIsPlaying((playing) => !playing)}
          onZoomOut={() => updateZoom(zoom - ZOOM_STEP)}
          onZoomIn={() => updateZoom(zoom + ZOOM_STEP)}
          onReset={resetView}
          onRotateLeft={() => setRotation((value) => value - 16)}
          onRotateRight={() => setRotation((value) => value + 16)}
        />
      </div>

      <div className="absolute end-3 top-3 z-30 md:end-4 md:top-4">
        <label className="flex h-10 items-center gap-1.5 rounded-xl border border-base-content/10 bg-base-100/80 px-2 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-base-100/70 sm:h-11 sm:gap-2 sm:px-2.5">
          <People size={15} className="shrink-0 text-secondary" />
          <span className="sr-only">Filter orbit nodes</span>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="select h-8 min-h-0 max-w-32 border-0 bg-transparent px-1 text-[10px] font-bold shadow-none focus:outline-none sm:max-w-36 sm:text-[11px]"
          >
            <option value="all">All members</option>
            {teamNames.map((team) => <option key={`team:${team}`} value={`team:${team}`}>Team: {team}</option>)}
            {roleNames.map((role) => <option key={`role:${role}`} value={`role:${role}`}>Role: {role}</option>)}
          </select>
        </label>
      </div>

      <div className="absolute bottom-3 start-1/2 z-30 -translate-x-1/2 sm:hidden rtl:translate-x-1/2">
        <OrbitControls
          isPlaying={isPlaying}
          onTogglePlaying={() => setIsPlaying((playing) => !playing)}
          onZoomOut={() => updateZoom(zoom - ZOOM_STEP)}
          onZoomIn={() => updateZoom(zoom + ZOOM_STEP)}
          onReset={resetView}
          onRotateLeft={() => setRotation((value) => value - 16)}
          onRotateRight={() => setRotation((value) => value + 16)}
        />
      </div>

      <div
        className="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onWheel={(event) => {
          if (!event.ctrlKey) return;
          event.preventDefault();
          updateZoom(zoom - event.deltaY * 0.002);
        }}
        aria-label="Interactive project orbit. Drag to rotate and pinch to zoom."
      >
        <motion.div
          className="absolute inset-x-[5%] bottom-[20%] top-[18%] sm:bottom-[4%] sm:top-[17%] md:inset-x-[12%] md:top-[13%]"
          animate={{ scale: zoom }}
          transition={{ type: "spring", stiffness: 180, damping: 24 }}
        >
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: rotation }}
            transition={{ type: "spring", stiffness: 180, damping: 24 }}
          >
          {rings.map((ring) => (
            <div
              key={ring.id}
              className="pointer-events-none absolute start-1/2 top-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-base-content/20 [border-dasharray:5_5] dark:border-base-content/10 [[data-theme=dark]_&]:border-base-content/10 rtl:translate-x-1/2"
              style={{ width: `${ring.size}%` }}
            >
              <span className="absolute start-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-base-content/10 bg-base-100/80 px-2 py-0.5 text-xs font-medium text-base-content/70 backdrop-blur-xs dark:bg-base-300/60 dark:text-base-content/50 [[data-theme=dark]_&]:bg-base-300/60 [[data-theme=dark]_&]:text-base-content/50 rtl:translate-x-1/2">
                {ring.label}
              </span>
            </div>
          ))}

          {rings.map((ring, ringIndex) => {
            const ringMembers = visibleMembers.filter((member, index) => memberRingIndex(member, index) === ringIndex);
            const displayedMembers = ringMembers.length > MAX_RING_NODES
              ? ringMembers.slice(0, VISIBLE_RING_MEMBERS)
              : ringMembers;
            const remainingMembers = ringMembers.slice(displayedMembers.length);
            const renderedNodeCount = displayedMembers.length + (remainingMembers.length > 0 ? 1 : 0);
            const duration = 30 + ringIndex * 11;

            return (
              <div
                key={`nodes-${ring.id}`}
                className="pointer-events-none absolute start-1/2 top-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2"
                style={{ width: `${ring.size}%` }}
              >
                <motion.div
                  className="absolute inset-0"
                  animate={isPlaying && !reduceMotion ? { rotate: 360 } : undefined}
                  transition={{ duration, ease: "linear", repeat: Infinity }}
                >
                  {displayedMembers.map((member, memberIndex) => {
                    const angle = (360 / Math.max(1, renderedNodeCount)) * memberIndex + ringIndex * 31;
                    const radians = ((angle - 90) * Math.PI) / 180;
                    const name = getMemberName(member);
                    const role = getMemberRole(member);

                    return (
                      <div
                        key={member.id}
                        className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
                        style={{
                          left: `${50 + Math.cos(radians) * 50}%`,
                          top: `${50 + Math.sin(radians) * 50}%`,
                        }}
                      >
                        <motion.div
                          animate={isPlaying && !reduceMotion ? { rotate: -360 } : undefined}
                          transition={{ duration, ease: "linear", repeat: Infinity }}
                        >
                          <div className="group relative" data-orbit-node>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedCluster(null);
                            setSelectedMember(member);
                          }}
                          className="relative grid size-11 min-h-10 min-w-10 place-items-center overflow-hidden rounded-2xl border-2 border-secondary/35 bg-secondary text-[11px] font-black text-secondary-content shadow-[0_8px_25px_color-mix(in_srgb,var(--color-secondary)_35%,transparent)] transition duration-200 hover:scale-110 hover:border-secondary md:size-12"
                          aria-label={`Open details for ${name}`}
                        >
                          {member.user?.avatar ? (
                            <img src={member.user.avatar} alt="" className="size-full object-cover" />
                          ) : member.team ? (
                            <People size={18} />
                          ) : (
                            getInitials(name)
                          )}
                          <span className="absolute end-0.5 top-0.5 size-2 rounded-full border border-secondary bg-success" />
                        </button>
                        <div className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] start-1/2 z-40 hidden w-max max-w-44 -translate-x-1/2 rounded-xl border border-base-content/10 bg-base-100/95 px-3 py-2 text-center shadow-xl backdrop-blur-xl group-hover:md:block group-focus-within:md:block rtl:translate-x-1/2">
                          <p dir="auto" className="max-w-36 truncate text-[11px] font-bold text-base-content">{name}</p>
                          <p dir="auto" className="mt-0.5 max-w-36 truncate text-[9px] font-semibold text-secondary">{role}</p>
                        </div>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                  {remainingMembers.length > 0 && (() => {
                    const clusterIndex = displayedMembers.length;
                    const angle = (360 / renderedNodeCount) * clusterIndex + ringIndex * 31;
                    const radians = ((angle - 90) * Math.PI) / 180;

                    return (
                      <div
                        className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
                        style={{
                          left: `${50 + Math.cos(radians) * 50}%`,
                          top: `${50 + Math.sin(radians) * 50}%`,
                        }}
                      >
                        <motion.div
                          animate={isPlaying && !reduceMotion ? { rotate: -360 } : undefined}
                          transition={{ duration, ease: "linear", repeat: Infinity }}
                        >
                          <div data-orbit-node>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedMember(null);
                                setSelectedCluster({ label: ring.label, members: remainingMembers });
                              }}
                              className="grid size-11 min-h-10 min-w-10 place-items-center rounded-2xl border-2 border-secondary/35 bg-base-100 text-[11px] font-black text-secondary shadow-[0_8px_25px_color-mix(in_srgb,var(--color-secondary)_22%,transparent)] transition duration-200 hover:scale-110 hover:border-secondary hover:bg-secondary hover:text-secondary-content active:scale-95 md:size-12"
                              aria-label={`Show ${remainingMembers.length} more members in ${ring.label}`}
                            >
                              +{remainingMembers.length}
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })()}
                </motion.div>
              </div>
            );
          })}
          </motion.div>

          <div
            className="absolute start-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2"
          >
            <motion.div
              animate={reduceMotion ? undefined : { scale: [1, 1.035, 1] }}
              transition={{ duration: 4.5, ease: "easeInOut", repeat: Infinity }}
            >
            <div className="absolute inset-[-48%] -z-10 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-warning)_25%,transparent)_0%,transparent_70%)] blur-2xl" />
            <div
              className="grid size-22 place-items-center rounded-full border border-warning/45 p-1.5 text-warning-content shadow-[0_0_55px_color-mix(in_srgb,var(--color-warning)_38%,transparent)] sm:size-28 sm:p-2 md:size-36"
              style={{
                background: "radial-gradient(circle at 35% 28%, color-mix(in srgb, var(--color-warning-content) 22%, transparent), transparent 30%), linear-gradient(135deg, var(--color-warning), color-mix(in srgb, var(--color-warning) 72%, var(--color-error)))",
              }}
            >
              <div className="grid size-full place-items-center rounded-full border border-warning-content/20 bg-warning-content/10 p-1 text-center backdrop-blur-sm sm:p-2 md:p-3">
                <div className="min-w-0">
                  <p dir="auto" className="line-clamp-2 text-[8px] font-black leading-tight text-warning-content sm:text-[10px] md:text-xs">{project.name}</p>
                  <div
                    className="mx-auto mt-0.5 grid size-7 place-items-center rounded-full sm:mt-1 sm:size-9 md:size-11"
                    style={{ background: `conic-gradient(var(--color-warning-content) ${progress * 3.6}deg, color-mix(in srgb, var(--color-warning-content) 22%, transparent) 0deg)` }}
                  >
                    <div className="grid size-5 place-items-center rounded-full bg-warning text-[7px] font-black text-warning-content sm:size-7 sm:text-[9px] md:size-8 md:text-[10px]">{progress}%</div>
                  </div>
                  <span className={`mt-0.5 inline-flex max-w-full truncate rounded-full px-1.5 py-0.5 text-[6px] font-black uppercase leading-none tracking-wide sm:mt-1 sm:px-2 sm:text-[7px] md:text-[8px] ${statusClasses[project.status]}`}>{statusLabel}</span>
                  <p className="mt-0.5 flex max-w-full items-center justify-center gap-0.5 truncate text-[6px] font-bold leading-none text-warning-content/85 sm:text-[7px] md:mt-1 md:gap-1 md:text-[9px]"><Calendar1 size={8} className="shrink-0" /> <span className="truncate">{formatDeadline(project.deadline)}</span></p>
                </div>
              </div>
            </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {visibleMembers.length === 0 && (
        <div className="pointer-events-none absolute inset-x-4 bottom-5 z-20 mx-auto max-w-sm rounded-xl border border-base-content/8 bg-base-100/85 px-4 py-3 text-center text-xs font-semibold text-base-content/50 backdrop-blur-xl">
          No members match this filter.
        </div>
      )}

      <AnimatePresence>
        {(selectedMember || selectedCluster) && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-neutral/35 backdrop-blur-[2px] md:hidden"
              onClick={closePanels}
              aria-label="Close orbit details"
            />
            <motion.aside
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[75vh] overflow-y-auto rounded-t-3xl border border-base-content/10 bg-base-100 shadow-2xl md:absolute md:bottom-auto md:end-4 md:start-auto md:top-20 md:w-72 md:rounded-2xl"
            >
              <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-base-content/15 md:hidden" />
              {selectedMember ? (
                <MemberDetails member={selectedMember} onClose={closePanels} />
              ) : selectedCluster ? (
                <ClusterDetails
                  cluster={selectedCluster}
                  onClose={closePanels}
                  onSelectMember={(member) => {
                    setSelectedCluster(null);
                    setSelectedMember(member);
                  }}
                />
              ) : null}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
