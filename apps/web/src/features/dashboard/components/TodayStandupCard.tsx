import { Calendar, NoteText } from "iconsax-reactjs";
import type { EmployeeStandup } from "../types";
import { TodayEmptyState } from "./TodayEmptyState";

interface TodayStandupCardProps {
  standup: EmployeeStandup | null;
  onOpen: () => void;
}

export const TodayStandupCard = ({ standup, onOpen }: TodayStandupCardProps) => (
  <section className="madaar-surface overflow-hidden">
    <div className="flex items-start justify-between gap-3 border-b border-base-content/8 p-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-base-content/45">Daily alignment</p>
        <h2 className="mt-1 text-lg font-bold text-base-content">Standup</h2>
      </div>
      <NoteText size={21} className="text-secondary" />
    </div>
    {standup ? (
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-base-content/45"><Calendar size={14} /> Submitted today</div>
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-wider text-base-content/40">Today&apos;s focus</p>
          <p className="mt-1 line-clamp-3 text-sm leading-6 text-base-content/75">{standup.today_work}</p>
        </div>
        {standup.blockers && (
          <div className="rounded-xl bg-warning/10 p-3">
            <p className="text-[0.68rem] font-bold uppercase tracking-wider text-warning">Blocker noted</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-warning/80">{standup.blockers}</p>
          </div>
        )}
        <button type="button" onClick={onOpen} className="motion-interactive w-full rounded-xl border border-base-content/10 px-3 py-2 text-xs font-bold text-base-content/65 hover:border-primary/30 hover:bg-primary/10 hover:text-primary">Update standup</button>
      </div>
    ) : (
      <TodayEmptyState
        icon={<NoteText size={23} />}
        title="No standup yet"
        description="Share yesterday, today and anything slowing you down."
        compact
        action={<button type="button" onClick={onOpen} className="motion-interactive rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-content hover:bg-primary/90">Write standup</button>}
      />
    )}
  </section>
);
