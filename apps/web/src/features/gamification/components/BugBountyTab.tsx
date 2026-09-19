import { useState } from "react";
import { motion } from "motion/react";
import { useBugBounties, useSubmitBugBounty } from "../api/gamificationApi";
import { Danger } from "iconsax-reactjs";

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { cls: string; label: string }> = {
    APPROVED: { cls: "badge-success", label: "Approved" },
    REJECTED: { cls: "badge-error",   label: "Rejected" },
    PENDING:  { cls: "badge-warning", label: "Pending"  },
  };
  const { cls, label } = map[status] ?? { cls: "badge-ghost", label: status };
  return <span className={`badge badge-sm ${cls}`}>{label}</span>;
};

export const BugBountyTab = () => {
  const { data: bounties, isLoading } = useBugBounties();
  const { mutate: submitBug, isPending } = useSubmitBugBounty();

  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [showForm,    setShowForm]    = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;
    submitBug({ title, description }, {
      onSuccess: () => { setTitle(""); setDescription(""); setShowForm(false); },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Internal Bug Bounty</h2>
          <p className="text-sm text-base-content/50 mt-0.5">
            Found a bug? Report it and earn points when it's confirmed by a lead.
          </p>
        </div>
        <button className="btn btn-primary btn-sm gap-2" onClick={() => setShowForm(!showForm)}>
          <Danger size={16} variant="Bold" />
          Report a Bug
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="card border border-primary/20 bg-primary/5"
        >
          <div className="card-body p-5">
            <h3 className="font-bold mb-3">Submit New Bug Report</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                className="input input-bordered w-full bg-base-200/50"
                placeholder="Bug title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <textarea
                className="textarea textarea-bordered w-full h-24 bg-base-200/50"
                placeholder="Describe the bug and steps to reproduce it..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
                  {isPending ? <span className="loading loading-spinner loading-xs" /> : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : !bounties?.length ? (
        <div className="flex flex-col items-center justify-center p-16 text-base-content/50">
          <Danger size={48} className="mb-4 opacity-50" />
          <p className="font-medium">No bug reports yet.</p>
          <p className="text-sm mt-1">Be the first to report one and earn bonus points!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bounties.map((bounty, i) => (
            <motion.div key={bounty.id}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card border border-base-content/10 bg-base-100/40 backdrop-blur-md"
            >
              <div className="card-body p-4 flex-row justify-between items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold">{bounty.title}</h4>
                  <p className="text-xs text-base-content/60 mt-0.5 truncate">{bounty.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StatusBadge status={bounty.status} />
                  {bounty.status === "APPROVED" && bounty.awarded_points > 0 && (
                    <span className="text-success text-sm font-bold">+{bounty.awarded_points} pts</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
