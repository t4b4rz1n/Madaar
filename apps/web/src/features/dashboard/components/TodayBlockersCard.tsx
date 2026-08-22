import { ArrowRight, Danger, TaskSquare } from "iconsax-reactjs";
import { Link } from "react-router-dom";
import type { EmployeeTaskSummary } from "../types";
import { TodayEmptyState } from "./TodayEmptyState";

export const TodayBlockersCard = ({ blockers }: { blockers: EmployeeTaskSummary[] }) => (
  <section className="madaar-surface overflow-hidden">
    <div className="flex items-start justify-between gap-3 border-b border-base-content/8 p-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-base-content/45">Needs attention</p>
        <h2 className="mt-1 text-lg font-bold text-base-content">Blockers</h2>
      </div>
      <Danger size={21} className={blockers.length ? "text-warning" : "text-base-content/30"} />
    </div>
    {blockers.length === 0 ? (
      <TodayEmptyState icon={<TaskSquare size={23} />} title="No blockers" description="Nothing is currently marked as blocked." compact />
    ) : (
      <div className="p-3">
        <div className="space-y-1">
          {blockers.slice(0, 3).map((task) => (
            <Link key={task.id} to="/tasks" className="motion-interactive flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-warning/10">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning"><Danger size={16} /></span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-base-content/75">{task.title}</span>
              <ArrowRight size={15} className="shrink-0 text-base-content/35" />
            </Link>
          ))}
        </div>
        <Link to="/tasks" className="motion-interactive mt-2 flex items-center justify-between rounded-xl bg-warning/10 px-3 py-2.5 text-xs font-bold text-warning hover:bg-warning/15">
          Resolve blockers <ArrowRight size={15} />
        </Link>
      </div>
    )}
  </section>
);
