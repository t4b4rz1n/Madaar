import { motion } from "motion/react";
import type { LeaderboardEntry } from "../types/gamificationTypes";

interface Props {
  entries?: LeaderboardEntry[];
  isLoading: boolean;
}

export const LeaderboardTable = ({ entries, isLoading }: Props) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton h-16 w-full rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return <div className="p-8 text-center text-base-content/60">No ranking available yet.</div>;
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <span className="text-2xl" title="1st Place">🥇</span>;
      case 1:
        return <span className="text-2xl" title="2nd Place">🥈</span>;
      case 2:
        return <span className="text-2xl" title="3rd Place">🥉</span>;
      default:
        return <span className="text-base-content/50 font-bold w-8 text-center">{index + 1}</span>;
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-base-content/10 bg-base-100/40 backdrop-blur-md">
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr className="bg-base-200/50">
              <th className="w-16 text-center">Rank</th>
              <th>User</th>
              <th className="text-end">Total Points</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <motion.tr
                key={entry.user.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="hover:bg-base-200/50 transition-colors"
              >
                <td className="text-center">
                  <div className="flex justify-center items-center h-full">
                    {getRankIcon(index)}
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="avatar">
                      <div className="w-10 h-10 rounded-full bg-base-300">
                        {entry.user.avatar_url ? (
                          <img src={entry.user.avatar_url} alt={entry.user.name} />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center font-bold text-base-content/50">
                            {entry.user.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="font-bold">{entry.user.name}</div>
                      <div className="text-xs opacity-50">@{entry.user.username}</div>
                    </div>
                  </div>
                </td>
                <td className="text-end font-mono text-lg font-semibold text-primary">
                  {entry.total_points}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
