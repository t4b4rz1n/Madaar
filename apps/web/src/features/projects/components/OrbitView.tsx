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

const MIN_ZOOM = 0.72;
const MAX_ZOOM = 1.35;
const ZOOM_STEP = 0.12;

const statusClasses: Record<Project["status"], string> = {
  active: "bg-success/15 text-success",
  draft: "bg-base-200 text-base-content/60",
  on_hold: "bg-warning/15 text-warning",
  completed: "bg-info/15 text-info",
  archived: "bg-error/15 text-error",
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
      size: count === 1 ? 72 : 42 + (index * 42) / (count - 1),
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

  return (
    <section className="relative isolate h-[480px] w-full overflow-hidden rounded-2xl border border-base-content/8 bg-base-100 shadow-sm md:h-[620px]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,color-mix(in_srgb,var(--color-warning)_13%,transparent),transparent_18%),radial-gradient(circle_at_50%_50%,color-mix(in_srgb,var(--color-secondary)_12%,transparent),transparent_56%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle,color-mix(in_srgb,var(--color-base-content)_18%,transparent)_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className="absolute inset-x-3 top-3 z-30 flex flex-wrap items-center justify-between gap-2 md:inset-x-4 md:top-4">
        <div className="flex items-center gap-1 rounded-xl border border-base-content/8 bg-base-100/80 p-1 shadow-sm backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setIsPlaying((playing) => !playing)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-bold text-base-content/70 transition hover:bg-base-200 hover:text-base-content"
            aria-label={isPlaying ? "Pause orbit animation" : "Play orbit animation"}
          >
            {isPlaying ? <Pause size={15} variant="Bold" /> : <Play size={15} variant="Bold" />}
            <span className="hidden sm:inline">{isPlaying ? "Pause" : "Play"}</span>
          </button>
          <button type="button" onClick={() => updateZoom(zoom - ZOOM_STEP)} className="grid size-9 place-items-center rounded-lg text-base-content/65 transition hover:bg-base-200 hover:text-base-content" aria-label="Zoom out">
            <SearchZoomOut size={16} />
          </button>
          <button type="button" onClick={() => updateZoom(zoom + ZOOM_STEP)} className="grid size-9 place-items-center rounded-lg text-base-content/65 transition hover:bg-base-200 hover:text-base-content" aria-label="Zoom in">
            <SearchZoomIn size={16} />
          </button>
          <button type="button" onClick={resetView} className="grid size-9 place-items-center rounded-lg text-base-content/65 transition hover:bg-base-200 hover:text-base-content" aria-label="Reset orbit view">
            <Refresh2 size={16} />
          </button>
          <div className="flex border-s border-base-content/10 ps-1">
            <button type="button" onClick={() => setRotation((value) => value - 16)} className="grid size-9 place-items-center rounded-lg text-base-content/65 transition hover:bg-base-200" aria-label="Rotate orbit left">
              <ArrowLeft2 size={15} />
            </button>
            <button type="button" onClick={() => setRotation((value) => value + 16)} className="grid size-9 place-items-center rounded-lg text-base-content/65 transition hover:bg-base-200" aria-label="Rotate orbit right">
              <ArrowRight2 size={15} />
            </button>
          </div>
        </div>

        <label className="flex h-11 items-center gap-2 rounded-xl border border-base-content/8 bg-base-100/80 px-2.5 shadow-sm backdrop-blur-xl">
          <People size={15} className="shrink-0 text-secondary" />
          <span className="sr-only">Filter orbit nodes</span>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="select h-8 min-h-0 max-w-36 border-0 bg-transparent px-1 text-[11px] font-bold shadow-none focus:outline-none"
          >
            <option value="all">All members</option>
            {teamNames.map((team) => <option key={`team:${team}`} value={`team:${team}`}>Team: {team}</option>)}
            {roleNames.map((role) => <option key={`role:${role}`} value={`role:${role}`}>Role: {role}</option>)}
          </select>
        </label>
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
          className="absolute inset-x-[5%] bottom-[3%] top-[17%] md:inset-x-[12%] md:bottom-[4%] md:top-[13%]"
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
              className="pointer-events-none absolute start-1/2 top-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-secondary/30 shadow-[0_0_22px_color-mix(in_srgb,var(--color-secondary)_8%,transparent)] rtl:translate-x-1/2"
              style={{ width: `${ring.size}%` }}
            >
              <span className="absolute start-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-secondary/15 bg-base-100/80 px-2 py-0.5 text-[9px] font-bold text-secondary/75 backdrop-blur-md rtl:translate-x-1/2">
                {ring.label}
              </span>
            </div>
          ))}

          {rings.map((ring, ringIndex) => {
            const ringMembers = visibleMembers.filter((member, index) => memberRingIndex(member, index) === ringIndex);
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
                  {ringMembers.map((member, memberIndex) => {
                    const angle = (360 / Math.max(1, ringMembers.length)) * memberIndex + ringIndex * 31;
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
            <div className="absolute inset-[-42%] -z-10 rounded-full bg-warning/15 blur-3xl" />
            <div className="grid size-28 place-items-center rounded-full border border-warning/35 bg-gradient-to-br from-warning via-orange-500 to-amber-600 p-2 text-warning-content shadow-[0_0_55px_color-mix(in_srgb,var(--color-warning)_45%,transparent)] sm:size-32 md:size-40">
              <div className="grid size-full place-items-center rounded-full border border-white/20 bg-black/10 p-3 text-center backdrop-blur-sm">
                <div className="min-w-0">
                  <p dir="auto" className="line-clamp-2 text-[11px] font-black leading-tight text-white md:text-sm">{project.name}</p>
                  <div className="mx-auto mt-2 grid size-11 place-items-center rounded-full md:size-13" style={{ background: `conic-gradient(white ${progress * 3.6}deg, rgb(255 255 255 / 0.22) 0deg)` }}>
                    <div className="grid size-8 place-items-center rounded-full bg-orange-600 text-[10px] font-black text-white md:size-10 md:text-xs">{progress}%</div>
                  </div>
                  <span className={`mt-2 inline-flex rounded-full bg-white/90 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide ${statusClasses[project.status]}`}>{statusLabel}</span>
                  <p className="mt-1 flex items-center justify-center gap-1 text-[8px] font-bold text-white/85 md:text-[9px]"><Calendar1 size={10} /> {formatDeadline(project.deadline)}</p>
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
        {selectedMember && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-neutral/35 backdrop-blur-[2px] md:hidden"
              onClick={() => setSelectedMember(null)}
              aria-label="Close member details"
            />
            <motion.aside
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[75vh] overflow-y-auto rounded-t-3xl border border-base-content/10 bg-base-100 shadow-2xl md:absolute md:bottom-auto md:end-4 md:start-auto md:top-20 md:w-72 md:rounded-2xl"
            >
              <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-base-content/15 md:hidden" />
              <MemberDetails member={selectedMember} onClose={() => setSelectedMember(null)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
