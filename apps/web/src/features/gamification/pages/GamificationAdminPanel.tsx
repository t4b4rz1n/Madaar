import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  useAdminBugBounties, useResolveBugBounty,
  usePendingUserQuests, useResolveUserQuest,
  useAdminMentorships, useResolveMentorship,
  useAdminConversions, useResolveConversion,
  useAdminQuests, useCreateQuest, useUpdateQuest,
  useAdminStoreItems, useCreateStoreItem,
  useAwardBadge, useAdminBadges,
} from "../api/adminGamificationApi";
import { useAdminStorePurchases } from "../api/adminGamificationApi";
import { Danger, Award, Shop, MoneyRecive, ClipboardText, MedalStar, People } from "iconsax-reactjs";

type Tab = "reviews" | "quests" | "store" | "badges";

// ── Reusable resolve button pair ──────────────────────────────────────────────
const ResolveButtons = ({
  onApprove, onReject, isPending, awardedPoints, setAwardedPoints, requirePoints = false,
}: {
  onApprove: () => void; onReject: () => void; isPending: boolean;
  awardedPoints?: number; setAwardedPoints?: (v: number) => void; requirePoints?: boolean;
}) => (
  <div className="flex items-center gap-2 flex-wrap">
    {requirePoints && setAwardedPoints !== undefined && (
      <input
        type="number" min={1} placeholder="Points"
        value={awardedPoints ?? 0}
        onChange={(e) => setAwardedPoints(Number(e.target.value))}
        className="input input-xs input-bordered w-24"
      />
    )}
    <button className="btn btn-success btn-xs" disabled={isPending} onClick={onApprove}>
      {isPending ? <span className="loading loading-spinner loading-xs" /> : "Approve"}
    </button>
    <button className="btn btn-error btn-xs" disabled={isPending} onClick={onReject}>Reject</button>
  </div>
);

// ── STATUS badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    APPROVED: "badge-success", REJECTED: "badge-error", PENDING: "badge-warning",
    FULFILLED: "badge-success", CANCELLED: "badge-error",
  };
  return <span className={`badge badge-sm ${map[status] ?? "badge-ghost"}`}>{status}</span>;
};

// ─────────────────────────────────────────────────────────────────────────────
export const GamificationAdminPanel = () => {
  const [activeTab, setActiveTab] = useState<Tab>("reviews");

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "reviews", label: "Reviews",    icon: <ClipboardText size={16} /> },
    { key: "quests",  label: "Quests",     icon: <Award size={16} /> },
    { key: "store",   label: "Store",      icon: <Shop size={16} /> },
    { key: "badges",  label: "Badges",     icon: <MedalStar size={16} /> },
  ];

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-warning/10 text-warning rounded-xl">
          <People size={28} variant="Bold" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Gamification Admin</h1>
          <p className="text-sm text-base-content/50">Manage quests, review submissions, and control the reward store.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-200/50 backdrop-blur-md p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab gap-2 ${activeTab === t.key ? "tab-active bg-primary text-primary-content" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── Reviews Tab ── */}
        {activeTab === "reviews" && (
          <motion.div key="reviews"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <BugBountyReviews />
            <QuestCompletionReviews />
            <MentorshipReviews />
            <BonusConversionReviews />
            <StorePurchaseFulfillment />
          </motion.div>
        )}

        {/* ── Quests Tab ── */}
        {activeTab === "quests" && (
          <motion.div key="quests"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          >
            <QuestManagement />
          </motion.div>
        )}

        {/* ── Store Tab ── */}
        {activeTab === "store" && (
          <motion.div key="store"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          >
            <StoreManagement />
          </motion.div>
        )}

        {/* ── Badges Tab ── */}
        {activeTab === "badges" && (
          <motion.div key="badges"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          >
            <BadgeManagement />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-SECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Bug Bounty Reviews ────────────────────────────────────────────────────────
const BugBountyReviews = () => {
  const { data: bounties, isLoading } = useAdminBugBounties();
  const { mutate: resolve, isPending } = useResolveBugBounty();
  const [points, setPoints] = useState<Record<string, number>>({});

  const pending = bounties?.filter((b) => b.status === "PENDING") ?? [];

  return (
    <SectionCard icon={<Danger size={18} variant="Bold" />} title="Bug Bounty" badge={pending.length}>
      {isLoading ? <Skeleton /> : !pending.length ? (
        <Empty text="No pending bug reports." />
      ) : (
        <Table heads={["Reporter", "Title", "Description", "Action"]}>
          {pending.map((b) => (
            <tr key={b.id} className="hover:bg-base-200/30">
              <td className="font-medium">{b.reporter.name}</td>
              <td className="font-semibold">{b.title}</td>
              <td className="text-sm text-base-content/60 max-w-xs truncate">{b.description}</td>
              <td>
                <ResolveButtons
                  requirePoints
                  awardedPoints={points[b.id] ?? 50}
                  setAwardedPoints={(v) => setPoints((p) => ({ ...p, [b.id]: v }))}
                  isPending={isPending}
                  onApprove={() => resolve({ id: b.id, is_approved: true, awarded_points: points[b.id] ?? 50 })}
                  onReject={() => resolve({ id: b.id, is_approved: false, awarded_points: 0 })}
                />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </SectionCard>
  );
};

// ── Quest Completion Reviews ──────────────────────────────────────────────────
const QuestCompletionReviews = () => {
  const { data: userQuests, isLoading } = usePendingUserQuests();
  const { mutate: resolve, isPending } = useResolveUserQuest();

  return (
    <SectionCard icon={<Award size={18} variant="Bold" />} title="Quest Completions" badge={userQuests?.length ?? 0}>
      {isLoading ? <Skeleton /> : !userQuests?.length ? (
        <Empty text="No pending quest completions." />
      ) : (
        <Table heads={["User", "Quest", "Points", "Action"]}>
          {userQuests.map((uq) => (
            <tr key={uq.id} className="hover:bg-base-200/30">
              <td className="font-medium">{uq.user}</td>
              <td className="font-semibold">{uq.quest.title}</td>
              <td className="text-primary font-bold">+{uq.quest.points_reward}</td>
              <td>
                <ResolveButtons
                  isPending={isPending}
                  onApprove={() => resolve({ id: uq.id, is_approved: true })}
                  onReject={()  => resolve({ id: uq.id, is_approved: false })}
                />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </SectionCard>
  );
};

// ── Mentorship Reviews ────────────────────────────────────────────────────────
const MentorshipReviews = () => {
  const { data: sessions, isLoading } = useAdminMentorships();
  const { mutate: resolve, isPending } = useResolveMentorship();
  const [points, setPoints] = useState<Record<string, number>>({});

  const pending = sessions?.filter((s) => s.status === "PENDING") ?? [];

  return (
    <SectionCard icon={<People size={18} variant="Bold" />} title="Mentorship Sessions" badge={pending.length}>
      {isLoading ? <Skeleton /> : !pending.length ? (
        <Empty text="No pending mentorship sessions." />
      ) : (
        <Table heads={["Mentor", "Mentee", "Duration", "Description", "Action"]}>
          {pending.map((s) => (
            <tr key={s.id} className="hover:bg-base-200/30">
              <td className="font-medium">{s.mentor.name}</td>
              <td>{s.mentee.name}</td>
              <td className="text-sm">{s.duration_hours}h</td>
              <td className="text-sm text-base-content/60 max-w-xs truncate">{s.description}</td>
              <td>
                <ResolveButtons
                  requirePoints
                  awardedPoints={points[s.id] ?? 30}
                  setAwardedPoints={(v) => setPoints((p) => ({ ...p, [s.id]: v }))}
                  isPending={isPending}
                  onApprove={() => resolve({ id: s.id, is_approved: true, awarded_points: points[s.id] ?? 30 })}
                  onReject={() => resolve({ id: s.id, is_approved: false, awarded_points: 0 })}
                />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </SectionCard>
  );
};

// ── Bonus Conversion Reviews ──────────────────────────────────────────────────
const BonusConversionReviews = () => {
  const { data: conversions, isLoading } = useAdminConversions();
  const { mutate: resolve, isPending } = useResolveConversion();

  const pending = conversions?.filter((c) => c.status === "PENDING") ?? [];

  return (
    <SectionCard icon={<MoneyRecive size={18} variant="Bold" />} title="Cash Conversion Requests" badge={pending.length}>
      {isLoading ? <Skeleton /> : !pending.length ? (
        <Empty text="No pending conversion requests." />
      ) : (
        <Table heads={["User", "Points", "Cash Value", "Status", "Action"]}>
          {pending.map((c) => (
            <tr key={c.id} className="hover:bg-base-200/30">
              <td className="font-medium">{c.user}</td>
              <td className="font-bold text-primary">{c.points_converted} pts</td>
              <td>{c.cash_value}</td>
              <td><StatusBadge status={c.status} /></td>
              <td>
                <ResolveButtons
                  isPending={isPending}
                  onApprove={() => resolve({ id: c.id, is_approved: true })}
                  onReject={()  => resolve({ id: c.id, is_approved: false })}
                />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </SectionCard>
  );
};

// ── Store Purchase Fulfillment ────────────────────────────────────────────────
const StorePurchaseFulfillment = () => {
  const { data: purchases, isLoading } = useAdminStorePurchases();
  const pending = purchases?.filter((p) => p.status === "PENDING") ?? [];

  return (
    <SectionCard icon={<Shop size={18} variant="Bold" />} title="Store Purchases (Fulfillment)" badge={pending.length}>
      {isLoading ? <Skeleton /> : !pending.length ? (
        <Empty text="No pending store purchases." />
      ) : (
        <Table heads={["User", "Item", "Cost", "Date", "Status"]}>
          {pending.map((p) => (
            <tr key={p.id} className="hover:bg-base-200/30">
              <td className="font-medium">{p.user}</td>
              <td>{p.item.name}</td>
              <td className="font-bold text-primary">{p.cost_at_purchase} pts</td>
              <td className="text-xs text-base-content/50">{new Date(p.created_at).toLocaleDateString("en-GB")}</td>
              <td><StatusBadge status={p.status} /></td>
            </tr>
          ))}
        </Table>
      )}
    </SectionCard>
  );
};

// ── Quest Management ──────────────────────────────────────────────────────────
const QuestManagement = () => {
  const { data: quests, isLoading } = useAdminQuests();
  const { mutate: createQuest, isPending: isCreating } = useCreateQuest();
  const { mutate: toggleQuest } = useUpdateQuest();

  const [title, setTitle] = useState("");
  const [desc,  setDesc]  = useState("");
  const [pts,   setPts]   = useState(50);
  const [showForm, setShowForm] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createQuest(
      { title: { en: title }, description: { en: desc }, points_reward: pts, is_active: true },
      { onSuccess: () => { setTitle(""); setDesc(""); setPts(50); setShowForm(false); } }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Quest Management</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          + New Quest
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="card border border-primary/20 bg-primary/5">
          <div className="card-body p-5">
            <form onSubmit={handleCreate} className="space-y-3">
              <input className="input input-bordered w-full" placeholder="Quest title (English)" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <textarea className="textarea textarea-bordered w-full" placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
              <div className="flex items-center gap-3">
                <label className="label"><span className="label-text">Points reward</span></label>
                <input type="number" min={1} className="input input-bordered input-sm w-28" value={pts} onChange={(e) => setPts(Number(e.target.value))} required />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isCreating}>
                  {isCreating ? <span className="loading loading-spinner loading-xs" /> : "Create Quest"}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      {isLoading ? <Skeleton /> : !quests?.length ? (
        <Empty text="No quests yet. Create one above." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-base-content/10 bg-base-100/40">
          <table className="table w-full">
            <thead><tr className="bg-base-200/50"><th>Title</th><th>Points</th><th>Status</th><th>Toggle</th></tr></thead>
            <tbody>
              {quests.map((q) => (
                <tr key={q.id} className="hover:bg-base-200/30">
                  <td className="font-semibold">{q.title}</td>
                  <td className="text-primary font-bold">+{q.points_reward}</td>
                  <td><span className={`badge badge-sm ${q.is_active ? "badge-success" : "badge-ghost"}`}>{q.is_active ? "Active" : "Inactive"}</span></td>
                  <td>
                    <input type="checkbox" className="toggle toggle-sm toggle-primary"
                      checked={q.is_active}
                      onChange={() => toggleQuest({ id: q.id, is_active: !q.is_active })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Store Management ──────────────────────────────────────────────────────────
const StoreManagement = () => {
  const { data: items, isLoading } = useAdminStoreItems();
  const { mutate: createItem, isPending } = useCreateStoreItem();

  const [name,  setName]  = useState("");
  const [desc,  setDesc]  = useState("");
  const [cost,  setCost]  = useState(100);
  const [stock, setStock] = useState(10);
  const [showForm, setShowForm] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createItem(
      { name: { en: name }, description: { en: desc }, cost, stock, is_active: true },
      { onSuccess: () => { setName(""); setDesc(""); setCost(100); setStock(10); setShowForm(false); } }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Store Management</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>+ Add Item</button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="card border border-primary/20 bg-primary/5">
          <div className="card-body p-5">
            <form onSubmit={handleCreate} className="space-y-3">
              <input className="input input-bordered w-full" placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} required />
              <input className="input input-bordered w-full" placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
              <div className="flex gap-4">
                <div className="form-control flex-1">
                  <label className="label"><span className="label-text">Cost (pts)</span></label>
                  <input type="number" min={1} className="input input-bordered" value={cost} onChange={(e) => setCost(Number(e.target.value))} required />
                </div>
                <div className="form-control flex-1">
                  <label className="label"><span className="label-text">Stock</span></label>
                  <input type="number" min={0} className="input input-bordered" value={stock} onChange={(e) => setStock(Number(e.target.value))} required />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
                  {isPending ? <span className="loading loading-spinner loading-xs" /> : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      {isLoading ? <Skeleton /> : !items?.length ? (
        <Empty text="No store items yet. Add one above." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-base-content/10 bg-base-100/40">
          <table className="table w-full">
            <thead><tr className="bg-base-200/50"><th>Item</th><th>Cost</th><th>Stock</th><th>Status</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-base-200/30">
                  <td className="font-semibold">{item.name}</td>
                  <td className="text-primary font-bold">{item.cost} pts</td>
                  <td>{item.stock}</td>
                  <td><span className={`badge badge-sm ${item.is_active ? "badge-success" : "badge-ghost"}`}>{item.is_active ? "Active" : "Inactive"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Badge Management ──────────────────────────────────────────────────────────
const BadgeManagement = () => {
  const { data: badges, isLoading } = useAdminBadges();
  const { mutate: awardBadge, isPending } = useAwardBadge();

  const [awardingBadgeId, setAwardingBadgeId] = useState<string | null>(null);
  const [userId, setUserId] = useState("");

  const handleAward = (badgeId: string) => {
    if (!userId.trim()) return;
    awardBadge({ badgeId, userId }, {
      onSuccess: () => { setAwardingBadgeId(null); setUserId(""); },
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Badge Management</h2>
      <p className="text-sm text-base-content/50">
        Manually award badges to team members. System badges are awarded automatically.
      </p>

      {isLoading ? <Skeleton /> : !badges?.length ? (
        <Empty text="No badges defined yet." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((badge) => (
            <div key={badge.id} className="card border border-base-content/10 bg-base-100/40 backdrop-blur-md">
              <div className="card-body p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {badge.icon
                    ? <img src={badge.icon} alt="" className="w-10 h-10 object-contain" />
                    : <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xl">🏅</div>
                  }
                  <div>
                    <h4 className="font-semibold">{badge.name}</h4>
                    <div className="flex gap-1 mt-0.5">
                      <span className="badge badge-xs badge-outline">+{badge.points_reward} pts</span>
                      {badge.is_system_managed && <span className="badge badge-xs">auto</span>}
                    </div>
                  </div>
                </div>

                {!badge.is_system_managed && (
                  awardingBadgeId === badge.id ? (
                    <div className="flex gap-2">
                      <input className="input input-xs input-bordered flex-1" placeholder="User ID or username"
                        value={userId} onChange={(e) => setUserId(e.target.value)} />
                      <button className="btn btn-primary btn-xs" disabled={isPending} onClick={() => handleAward(badge.id)}>
                        {isPending ? <span className="loading loading-spinner loading-xs" /> : "Award"}
                      </button>
                      <button className="btn btn-ghost btn-xs" onClick={() => setAwardingBadgeId(null)}>✕</button>
                    </div>
                  ) : (
                    <button className="btn btn-outline btn-xs btn-primary" onClick={() => setAwardingBadgeId(badge.id)}>
                      Award to Member
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Shared UI helpers ─────────────────────────────────────────────────────────
const SectionCard = ({ icon, title, badge, children }: {
  icon: React.ReactNode; title: string; badge?: number; children: React.ReactNode;
}) => (
  <div className="card border border-base-content/10 bg-base-100/40 backdrop-blur-md">
    <div className="card-body p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h3 className="font-bold text-lg">{title}</h3>
        {badge !== undefined && badge > 0 && (
          <span className="badge badge-warning badge-sm">{badge} pending</span>
        )}
      </div>
      {children}
    </div>
  </div>
);

const Table = ({ heads, children }: { heads: string[]; children: React.ReactNode }) => (
  <div className="overflow-x-auto rounded-xl border border-base-content/10">
    <table className="table w-full">
      <thead><tr className="bg-base-200/50">{heads.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

const Skeleton = () => (
  <div className="space-y-2">
    {[1, 2].map((i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
  </div>
);

const Empty = ({ text }: { text: string }) => (
  <p className="text-base-content/50 text-sm py-4 text-center">{text}</p>
);
