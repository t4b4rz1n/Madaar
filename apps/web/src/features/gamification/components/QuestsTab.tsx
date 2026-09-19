import { motion } from "motion/react";
import { useQuests, useMyUserQuests, useRequestQuestCompletion } from "../api/gamificationApi";
import { Award, TickCircle, Clock } from "iconsax-reactjs";

export const QuestsTab = () => {
  const { data: quests,   isLoading: isQuestsLoading } = useQuests();
  const { data: myQuests }                             = useMyUserQuests();
  const { mutate: requestCompletion, isPending }       = useRequestQuestCompletion();

  const completedIds = new Set(
    myQuests?.filter((uq) => uq.status === "APPROVED").map((uq) => uq.quest.id) ?? []
  );
  const pendingIds = new Set(
    myQuests?.filter((uq) => uq.status === "PENDING").map((uq) => uq.quest.id) ?? []
  );

  if (isQuestsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-36 rounded-xl" />)}
      </div>
    );
  }

  if (!quests?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-base-content/50">
        <Award size={48} className="mb-4 opacity-50" />
        <p className="font-medium">No active quests available.</p>
        <p className="text-sm mt-1">Check back later — your manager will add new quests soon.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Optional Quests</h2>
        <span className="text-sm text-base-content/50">{quests.length} quest{quests.length !== 1 ? "s" : ""} available</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quests.map((quest, i) => {
          const isCompleted = completedIds.has(quest.id);
          const isPendingApproval = pendingIds.has(quest.id);

          return (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`card border backdrop-blur-md ${
                isCompleted
                  ? "border-success/30 bg-success/5"
                  : "border-base-content/10 bg-base-100/40"
              }`}
            >
              <div className="card-body p-5">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="card-title text-base">{quest.title}</h3>
                  <span className="badge badge-primary badge-outline shrink-0">+{quest.points_reward} pts</span>
                </div>
                {quest.description && (
                  <p className="text-sm text-base-content/60">{quest.description}</p>
                )}
                <div className="card-actions justify-end mt-2">
                  {isCompleted ? (
                    <span className="flex items-center gap-1 text-success text-sm font-semibold">
                      <TickCircle size={16} variant="Bold" /> Approved
                    </span>
                  ) : isPendingApproval ? (
                    <span className="flex items-center gap-1 text-warning text-sm font-semibold">
                      <Clock size={16} variant="Bold" /> Pending approval
                    </span>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={isPending}
                      onClick={() => requestCompletion(quest.id)}
                    >
                      {isPending
                        ? <span className="loading loading-spinner loading-xs" />
                        : "Mark as Complete"}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
