import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient from "../../../core/config/axiosClient";
import type {
  Badge, Quest, BugBounty, UserQuest, MentorshipSession,
  StorePurchase, BonusConversionRequest, StoreItem,
} from "../types/gamificationTypes";

// ── Keys ──────────────────────────────────────────────────────────────────────
export const adminGamificationKeys = {
  all:               ["admin-gamification"]          as const,
  allBadges:         () => ["admin-gamification", "badges"]       as const,
  allBugBounties:    () => ["admin-gamification", "bug-bounties"] as const,
  allQuests:         () => ["admin-gamification", "quests"]       as const,
  allUserQuests:     () => ["admin-gamification", "user-quests"]  as const,
  allMentorships:    () => ["admin-gamification", "mentorships"]  as const,
  allStoreItems:     () => ["admin-gamification", "store-items"]  as const,
  allStorePurchases: () => ["admin-gamification", "store-purchases"] as const,
  allConversions:    () => ["admin-gamification", "conversions"]  as const,
};

function list<T>(payload: { results?: T[] } | T[]): T[] {
  return (payload as any).results ?? (payload as T[]);
}

// ── Badges ────────────────────────────────────────────────────────────────────
export const useAdminBadges = () =>
  useQuery({
    queryKey: adminGamificationKeys.allBadges(),
    queryFn: async () => {
      const { data } = await axiosClient.get<{ data: Badge[] }>("/gamification/badges/");
      return list(data.data);
    },
  });

export const useCreateBadge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: Record<string,string>; description?: Record<string,string>; points_reward: number; is_system_managed: boolean }) => {
      const { data } = await axiosClient.post("/gamification/badges/", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminGamificationKeys.allBadges() }),
  });
};

export const useAwardBadge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ badgeId, userId }: { badgeId: string; userId: string }) => {
      const { data } = await axiosClient.post(`/gamification/badges/${badgeId}/award/`, { user_id: userId });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminGamificationKeys.allBadges() }),
  });
};

// ── Quests ────────────────────────────────────────────────────────────────────
export const useAdminQuests = () =>
  useQuery({
    queryKey: adminGamificationKeys.allQuests(),
    queryFn: async () => {
      const { data } = await axiosClient.get<{ data: Quest[] }>("/gamification/quests/");
      return list(data.data);
    },
  });

export const useCreateQuest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: Record<string,string>; description?: Record<string,string>; points_reward: number; is_active: boolean }) => {
      const { data } = await axiosClient.post("/gamification/quests/", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminGamificationKeys.allQuests() }),
  });
};

export const useUpdateQuest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; is_active: boolean }) => {
      const { data } = await axiosClient.patch(`/gamification/quests/${id}/`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminGamificationKeys.allQuests() }),
  });
};

// ── Pending User Quests (for review) ─────────────────────────────────────────
export const usePendingUserQuests = () =>
  useQuery({
    queryKey: adminGamificationKeys.allUserQuests(),
    queryFn: async () => {
      const { data } = await axiosClient.get<{ data: UserQuest[] }>("/gamification/user-quests/");
      return list(data.data).filter((uq) => uq.status === "PENDING");
    },
  });

export const useResolveUserQuest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_approved }: { id: string; is_approved: boolean }) => {
      const { data } = await axiosClient.post(`/gamification/user-quests/${id}/resolve/`, { is_approved });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminGamificationKeys.allUserQuests() }),
  });
};

// ── Bug Bounties ──────────────────────────────────────────────────────────────
export const useAdminBugBounties = () =>
  useQuery({
    queryKey: adminGamificationKeys.allBugBounties(),
    queryFn: async () => {
      const { data } = await axiosClient.get<{ data: BugBounty[] }>("/gamification/bug-bounty/");
      return list(data.data);
    },
  });

export const useResolveBugBounty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_approved, awarded_points }: { id: string; is_approved: boolean; awarded_points: number }) => {
      const { data } = await axiosClient.post(`/gamification/bug-bounty/${id}/resolve/`, { is_approved, awarded_points });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminGamificationKeys.allBugBounties() }),
  });
};

// ── Mentorships ───────────────────────────────────────────────────────────────
export const useAdminMentorships = () =>
  useQuery({
    queryKey: adminGamificationKeys.allMentorships(),
    queryFn: async () => {
      const { data } = await axiosClient.get<{ data: MentorshipSession[] }>("/gamification/mentorship/");
      return list(data.data);
    },
  });

export const useResolveMentorship = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_approved, awarded_points }: { id: string; is_approved: boolean; awarded_points: number }) => {
      const { data } = await axiosClient.post(`/gamification/mentorship/${id}/resolve/`, { is_approved, awarded_points });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminGamificationKeys.allMentorships() }),
  });
};

// ── Store Items ───────────────────────────────────────────────────────────────
export const useAdminStoreItems = () =>
  useQuery({
    queryKey: adminGamificationKeys.allStoreItems(),
    queryFn: async () => {
      const { data } = await axiosClient.get<{ data: StoreItem[] }>("/gamification/store-items/");
      return list(data.data);
    },
  });

export const useCreateStoreItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: Record<string,string>; description?: Record<string,string>; cost: number; stock: number; is_active: boolean }) => {
      const { data } = await axiosClient.post("/gamification/store-items/", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminGamificationKeys.allStoreItems() }),
  });
};

export const useUpdateStoreItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<StoreItem> & { id: string }) => {
      const { data } = await axiosClient.patch(`/gamification/store-items/${id}/`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminGamificationKeys.allStoreItems() }),
  });
};

// ── Store Purchases (fulfillment) ─────────────────────────────────────────────
export const useAdminStorePurchases = () =>
  useQuery({
    queryKey: adminGamificationKeys.allStorePurchases(),
    queryFn: async () => {
      const { data } = await axiosClient.get<{ data: StorePurchase[] }>("/gamification/store-purchases/");
      return list(data.data);
    },
  });

// ── Bonus Conversions ─────────────────────────────────────────────────────────
export const useAdminConversions = () =>
  useQuery({
    queryKey: adminGamificationKeys.allConversions(),
    queryFn: async () => {
      const { data } = await axiosClient.get<{ data: BonusConversionRequest[] }>("/gamification/bonus-conversion/");
      return list(data.data);
    },
  });

export const useResolveConversion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_approved }: { id: string; is_approved: boolean }) => {
      const { data } = await axiosClient.post(`/gamification/bonus-conversion/${id}/resolve/`, { is_approved, awarded_points: 0 });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminGamificationKeys.allConversions() }),
  });
};
