export interface BasicUser {
  id: string;
  username: string;
  name: string;
  avatar_url: string | null;
}

export interface UserPointBalance {
  id: string;
  total_points: number;
  spendable_points: number;
  kudos_budget: number;
}

export interface PointLedger {
  id: string;
  amount: number;
  source: "SYSTEM" | "KUDOS" | "QUEST" | "BUG_BOUNTY" | "STORE" | "MANUAL";
  description: Record<string, string> | string | null;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  points_reward: number;
  is_system_managed: boolean;
}

export interface UserBadge {
  id: string;
  badge: Badge;
  awarded_by: BasicUser | null;
  created_at: string;
}

export interface LeaderboardEntry {
  user: BasicUser;
  total_points: number;
}

export interface TeamLeaderboardEntry {
  team_id: string;
  team_name: string;
  points: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string | null;
  points_reward: number;
  is_active: boolean;
}

export interface UserQuest {
  id: string;
  user: string;
  quest: Quest;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
}

export interface Kudos {
  id: string;
  sender: BasicUser;
  receiver: BasicUser;
  amount: number;
  message: string;
  created_at: string;
}

export interface SendKudosPayload {
  receiver_id: string;
  amount: number;
  message: string;
}

export interface BugBounty {
  id: string;
  reporter: BasicUser;
  title: string;
  description: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  awarded_points: number;
  reviewer: BasicUser | null;
  created_at: string;
}

export interface MentorshipSession {
  id: string;
  mentor: BasicUser;
  mentee: BasicUser;
  description: string;
  duration_hours: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  awarded_points: number;
  created_at: string;
}

export interface StoreItem {
  id: string;
  name: string;
  description: string | null;
  cost: number;
  stock: number;
  is_active: boolean;
}

export interface StorePurchase {
  id: string;
  user: string;
  item: StoreItem;
  status: "PENDING" | "FULFILLED" | "CANCELLED";
  cost_at_purchase: number;
  created_at: string;
}

export interface BonusConversionRequest {
  id: string;
  user: string;
  points_converted: number;
  cash_value: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
}
