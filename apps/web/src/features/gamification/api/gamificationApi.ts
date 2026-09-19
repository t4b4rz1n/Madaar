import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient from "../../../core/config/axiosClient";
import type {
  UserPointBalance,
  PointLedger,
  UserBadge,
  LeaderboardEntry,
  TeamLeaderboardEntry,
  Quest,
  UserQuest,
  SendKudosPayload,
  BugBounty,
  MentorshipSession,
  StoreItem,
  StorePurchase,
  BonusConversionRequest,
} from "../types/gamificationTypes";

// ─── Query Keys ────────────────────────────────────────────────────────────────
export const gamificationKeys = {
  all: ["gamification"] as const,
  balance: () => [...gamificationKeys.all, "balance"] as const,
  badges: () => [...gamificationKeys.all, "badges"] as const,
  ledger: () => [...gamificationKeys.all, "ledger"] as const,
  leaderboard: () => [...gamificationKeys.all, "leaderboard"] as const,
  teamLeaderboard: () => [...gamificationKeys.all, "team-leaderboard"] as const,
  quests: () => [...gamificationKeys.all, "quests"] as const,
  userQuests: () => [...gamificationKeys.all, "user-quests"] as const,
  bugBounties: () => [...gamificationKeys.all, "bug-bounties"] as const,
  mentorships: () => [...gamificationKeys.all, "mentorships"] as const,
  storeItems: () => [...gamificationKeys.all, "store-items"] as const,
  storePurchases: () => [...gamificationKeys.all, "store-purchases"] as const,
  bonusConversions: () => [...gamificationKeys.all, "bonus-conversions"] as const,
};

// ─── Helper ──────────────────────────────────────────────────────────────────
function extractList<T>(payload: { results?: T[] } | T[]): T[] {
  return (payload as any).results ?? (payload as T[]);
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const useMyBalance = () =>
  useQuery({
    queryKey: gamificationKeys.balance(),
    queryFn: async () => {
      const { data } = await axiosClient.get<{ data: UserPointBalance }>("/gamification/dashboard/my_balance/");
      return data.data;
    },
  });

export const useMyBadges = () =>
  useQuery({
    queryKey: gamificationKeys.badges(),
    queryFn: async () => {
      const { data } = await axiosClient.get<{ data: UserBadge[] }>("/gamification/dashboard/my_badges/");
      return data.data;
    },
  });

export const useMyLedger = () =>
  useQuery({
    queryKey: gamificationKeys.ledger(),
    queryFn: async () => {
      const { data } = await axiosClient.get<{ data: PointLedger[] }>("/gamification/dashboard/my_ledger/");
      return data.data;
    },
  });

// ─── Leaderboards ────────────────────────────────────────────────────────────
export const useLeaderboard = () =>
  useQuery({
    queryKey: gamificationKeys.leaderboard(),
    queryFn: async () => {
      const { data } = await axiosClient.get<{ data: { results?: LeaderboardEntry[] } | LeaderboardEntry[] }>(
        "/gamification/leaderboard/"
      );
      return extractList(data.data);
    },
  });

export const useTeamLeaderboard = () =>
  useQuery<TeamLeaderboardEntry[]>({
    queryKey: gamificationKeys.teamLeaderboard(),
    queryFn: async (): Promise<TeamLeaderboardEntry[]> => {
      const { data } = await axiosClient.get<{ data: TeamLeaderboardEntry[] }>(
        "/gamification/team-leaderboard/"
      );
      return data.data ?? [];
    },
  });

// ─── Quests ──────────────────────────────────────────────────────────────────
export const useQuests = () =>
  useQuery({
    queryKey: gamificationKeys.quests(),
    queryFn: async () => {
      const { data } = await axiosClient.get<{ data: { results?: Quest[] } | Quest[] }>("/gamification/quests/");
      return extractList(data.data);
    },
  });

export const useMyUserQuests = () =>
  useQuery({
    queryKey: gamificationKeys.userQuests(),
    queryFn: async () => {
      const { data } = await axiosClient.get<{ data: { results?: UserQuest[] } | UserQuest[] }>(
        "/gamification/user-quests/"
      );
      return extractList(data.data);
    },
  });

export const useRequestQuestCompletion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (questId: string) => {
      const { data } = await axiosClient.post("/gamification/user-quests/", { quest_id: questId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gamificationKeys.userQuests() });
    },
  });
};

// ─── Kudos ───────────────────────────────────────────────────────────────────
export const useSendKudos = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SendKudosPayload) => {
      const { data } = await axiosClient.post("/gamification/kudos/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gamificationKeys.balance() });
      queryClient.invalidateQueries({ queryKey: gamificationKeys.ledger() });
    },
  });
};

// ─── Bug Bounty ──────────────────────────────────────────────────────────────
export const useBugBounties = () =>
  useQuery({
    queryKey: gamificationKeys.bugBounties(),
    queryFn: async () => {
      const { data } = await axiosClient.get<{ data: { results?: BugBounty[] } | BugBounty[] }>(
        "/gamification/bug-bounty/"
      );
      return extractList(data.data);
    },
  });

export const useSubmitBugBounty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; description: string }) => {
      const { data } = await axiosClient.post("/gamification/bug-bounty/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gamificationKeys.bugBounties() });
    },
  });
};

// ─── Mentorship ──────────────────────────────────────────────────────────────
export const useMentorships = () =>
  useQuery({
    queryKey: gamificationKeys.mentorships(),
    queryFn: async () => {
      const { data } = await axiosClient.get<{ data: { results?: MentorshipSession[] } | MentorshipSession[] }>(
        "/gamification/mentorship/"
      );
      return extractList(data.data);
    },
  });

export const useSubmitMentorship = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { mentee_id: string; description: string; duration_hours: number }) => {
      const { data } = await axiosClient.post("/gamification/mentorship/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gamificationKeys.mentorships() });
    },
  });
};

// ─── Store ───────────────────────────────────────────────────────────────────
export const useStoreItems = () =>
  useQuery({
    queryKey: gamificationKeys.storeItems(),
    queryFn: async () => {
      const { data } = await axiosClient.get<{ data: { results?: StoreItem[] } | StoreItem[] }>(
        "/gamification/store-items/"
      );
      return extractList(data.data);
    },
  });

export const useMyPurchases = () =>
  useQuery({
    queryKey: gamificationKeys.storePurchases(),
    queryFn: async () => {
      const { data } = await axiosClient.get<{ data: { results?: StorePurchase[] } | StorePurchase[] }>(
        "/gamification/store-purchases/"
      );
      return extractList(data.data);
    },
  });

export const usePurchaseItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { data } = await axiosClient.post("/gamification/store-purchases/", { item_id: itemId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gamificationKeys.balance() });
      queryClient.invalidateQueries({ queryKey: gamificationKeys.storePurchases() });
      queryClient.invalidateQueries({ queryKey: gamificationKeys.storeItems() });
    },
  });
};

// ─── Bonus Conversion ────────────────────────────────────────────────────────
export const useMyBonusConversions = () =>
  useQuery({
    queryKey: gamificationKeys.bonusConversions(),
    queryFn: async () => {
      const { data } = await axiosClient.get<{ data: { results?: BonusConversionRequest[] } | BonusConversionRequest[] }>(
        "/gamification/bonus-conversion/"
      );
      return extractList(data.data);
    },
  });

export const useRequestBonusConversion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pointsToConvert: number) => {
      const { data } = await axiosClient.post("/gamification/bonus-conversion/", {
        points_converted: pointsToConvert,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gamificationKeys.balance() });
      queryClient.invalidateQueries({ queryKey: gamificationKeys.bonusConversions() });
    },
  });
};
