import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  useMyBalance, useMyBadges, useLeaderboard, useTeamLeaderboard, useMyLedger,
  gamificationKeys,
} from "../api/gamificationApi";
import { useQueryClient } from "@tanstack/react-query";
import axiosClient from "../../../core/config/axiosClient";
import type { TeamLeaderboardEntry } from "../types/gamificationTypes";
import { UserBalanceCard } from "../components/UserBalanceCard";
import { BadgeShowcase } from "../components/BadgeShowcase";
import { LeaderboardTable } from "../components/LeaderboardTable";
import { SendKudosModal } from "../components/SendKudosModal";
import { QuestsTab } from "../components/QuestsTab";
import { BugBountyTab } from "../components/BugBountyTab";
import { StoreTab } from "../components/StoreTab";
import { PointLedgerTable } from "../components/PointLedgerTable";
import { Heart } from "iconsax-reactjs";

type Tab = "dashboard" | "leaderboard" | "quests" | "bugbounty" | "store";

const tabs: { key: Tab; label: string }[] = [
  { key: "dashboard",   label: "My Dashboard" },
  { key: "leaderboard", label: "Leaderboard"  },
  { key: "quests",      label: "Quests"        },
  { key: "bugbounty",   label: "Bug Bounty"    },
  { key: "store",       label: "Reward Store"  },
];

// Prefetch helper — fires all tab queries in parallel on mount
function usePrefetchGamification() {
  const qc = useQueryClient();
  useEffect(() => {
    const prefetch = (key: readonly unknown[], url: string) =>
      qc.prefetchQuery({ queryKey: key, queryFn: async () => {
        const { data } = await axiosClient.get(url);
        const payload = data?.data;
        return (payload as any)?.results ?? payload ?? data;
      }});

    // Fire all queries in parallel so switching tabs is instant
    prefetch(gamificationKeys.leaderboard(),      "/gamification/leaderboard/");
    prefetch(gamificationKeys.teamLeaderboard(),  "/gamification/team-leaderboard/");
    prefetch(gamificationKeys.quests(),            "/gamification/quests/");
    prefetch(gamificationKeys.userQuests(),        "/gamification/user-quests/");
    prefetch(gamificationKeys.bugBounties(),       "/gamification/bug-bounty/");
    prefetch(gamificationKeys.mentorships(),       "/gamification/mentorship/");
    prefetch(gamificationKeys.storeItems(),        "/gamification/store-items/");
    prefetch(gamificationKeys.storePurchases(),    "/gamification/store-purchases/");
    prefetch(gamificationKeys.bonusConversions(),  "/gamification/bonus-conversion/");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export const GamificationDashboard = () => {
  const [activeTab, setActiveTab]       = useState<Tab>("dashboard");
  const [isKudosModalOpen, setKudosModalOpen] = useState(false);

  // Kick off all tab data in parallel the moment the page mounts
  usePrefetchGamification();

  const { data: balance,       isLoading: isBalanceLoading       } = useMyBalance();
  const { data: badges,        isLoading: isBadgesLoading        } = useMyBadges();
  const { data: ledger,        isLoading: isLedgerLoading        } = useMyLedger();
  const { data: leaderboard,   isLoading: isLeaderboardLoading   } = useLeaderboard();
  const { data: teamLeaderboard, isLoading: isTeamLeaderboardLoading } = useTeamLeaderboard();

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rewards &amp; Leaderboard</h1>
          <p className="text-base-content/60 text-sm mt-1">
            Track your progress, earn badges, and appreciate your peers.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <div className="tabs tabs-boxed bg-base-200/50 backdrop-blur-md p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`tab transition-all ${activeTab === tab.key ? "tab-active bg-primary text-primary-content" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            className="btn btn-secondary btn-sm gap-2 whitespace-nowrap shadow-sm"
            onClick={() => setKudosModalOpen(true)}
          >
            <Heart size={16} variant="Bold" />
            Give Kudos
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[50vh] relative">
        <AnimatePresence mode="wait">

          {/* ── My Dashboard ── */}
          {activeTab === "dashboard" && (
            <motion.div key="dashboard"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <UserBalanceCard balance={balance} isLoading={isBalanceLoading} />

              <section>
                <h2 className="text-xl font-bold mb-4">My Badges</h2>
                <BadgeShowcase badges={badges} isLoading={isBadgesLoading} />
              </section>

              <section>
                <h2 className="text-xl font-bold mb-4">Recent Point Activity</h2>
                <PointLedgerTable ledger={ledger} isLoading={isLedgerLoading} />
              </section>
            </motion.div>
          )}

          {/* ── Leaderboard ── */}
          {activeTab === "leaderboard" && (
            <motion.div key="leaderboard"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-xl font-bold mb-4">Individual Leaderboard</h2>
                <LeaderboardTable entries={leaderboard} isLoading={isLeaderboardLoading} />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-4">Team Leaderboard</h2>
                {isTeamLeaderboardLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
                  </div>
                ) : !teamLeaderboard?.length ? (
                  <div className="p-8 text-center text-base-content/50">No teams registered yet.</div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-base-content/10 bg-base-100/40 backdrop-blur-md">
                    <table className="table w-full">
                      <thead>
                        <tr className="bg-base-200/50">
                          <th className="w-16 text-center">Rank</th>
                          <th>Team</th>
                          <th className="text-end">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamLeaderboard.map((team: TeamLeaderboardEntry, index) => (
                          <tr key={team.team_id} className="hover:bg-base-200/50 transition-colors">
                            <td className="text-center font-bold">{index + 1}</td>
                            <td className="font-semibold">{team.team_name}</td>
                            <td className="text-end font-mono text-lg font-semibold text-primary">{team.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Quests ── */}
          {activeTab === "quests" && (
            <motion.div key="quests"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            >
              <QuestsTab />
            </motion.div>
          )}

          {/* ── Bug Bounty ── */}
          {activeTab === "bugbounty" && (
            <motion.div key="bugbounty"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            >
              <BugBountyTab />
            </motion.div>
          )}

          {/* ── Reward Store ── */}
          {activeTab === "store" && (
            <motion.div key="store"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            >
              <StoreTab balance={balance} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <SendKudosModal isOpen={isKudosModalOpen} onClose={() => setKudosModalOpen(false)} />
    </div>
  );
};
