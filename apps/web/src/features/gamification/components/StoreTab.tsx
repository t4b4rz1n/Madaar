import { useState } from "react";
import { motion } from "motion/react";
import {
  useStoreItems, useMyPurchases, usePurchaseItem,
  useMyBonusConversions, useRequestBonusConversion,
} from "../api/gamificationApi";
import type { UserPointBalance } from "../types/gamificationTypes";
import { Shop, MoneyRecive, TickCircle } from "iconsax-reactjs";

interface Props { balance?: UserPointBalance; }

type Section = "store" | "conversion";

export const StoreTab = ({ balance }: Props) => {
  const { data: items,       isLoading: isItemsLoading } = useStoreItems();
  const { data: purchases }                              = useMyPurchases();
  const { data: conversions }                            = useMyBonusConversions();
  const { mutate: purchaseItem,      isPending: isPurchasing } = usePurchaseItem();
  const { mutate: requestConversion, isPending: isConverting  } = useRequestBonusConversion();

  const [pointsToConvert, setPointsToConvert] = useState(100);
  const [section, setSection] = useState<Section>("store");

  const purchasedIds = new Set(purchases?.map((p) => p.item.id) ?? []);

  const convStatus = (s: string) => ({
    APPROVED: { cls: "badge-success", label: "Paid"    },
    REJECTED: { cls: "badge-error",   label: "Rejected"},
    PENDING:  { cls: "badge-warning", label: "Pending" },
  }[s] ?? { cls: "badge-ghost", label: s });

  return (
    <div className="space-y-6">

      {/* Sub-nav */}
      <div className="flex gap-2 border-b border-base-content/10 pb-3">
        <button className={`btn btn-sm gap-1 ${section === "store" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setSection("store")}>
          <Shop size={15} /> Reward Store
        </button>
        <button className={`btn btn-sm gap-1 ${section === "conversion" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setSection("conversion")}>
          <MoneyRecive size={15} /> Cash Conversion
        </button>
      </div>

      {/* ── Store ── */}
      {section === "store" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Reward Store</h2>
            {balance && (
              <span className="badge badge-outline">
                Balance: {balance.spendable_points} pts
              </span>
            )}
          </div>

          {isItemsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
            </div>
          ) : !items?.length ? (
            <div className="flex flex-col items-center justify-center p-16 text-base-content/50">
              <Shop size={48} className="mb-4 opacity-50" />
              <p className="font-medium">No items in the store yet.</p>
              <p className="text-sm mt-1">Your admin will add items soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item, i) => {
                const canAfford   = (balance?.spendable_points ?? 0) >= item.cost;
                const purchased   = purchasedIds.has(item.id);
                return (
                  <motion.div key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="card border border-base-content/10 bg-base-100/40 backdrop-blur-md"
                  >
                    <div className="card-body p-5">
                      <h3 className="card-title text-base">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-base-content/60">{item.description}</p>
                      )}
                      <div className="flex justify-between items-center mt-3">
                        <div>
                          <span className="text-primary font-bold text-lg">{item.cost}</span>
                          <span className="text-xs text-base-content/50 ml-1">pts</span>
                        </div>
                        <span className="text-xs text-base-content/50">Stock: {item.stock}</span>
                      </div>
                      <div className="card-actions justify-end mt-2">
                        {purchased ? (
                          <span className="flex items-center gap-1 text-success text-sm">
                            <TickCircle size={16} variant="Bold" /> Purchased
                          </span>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm w-full"
                            disabled={!canAfford || isPurchasing || item.stock <= 0}
                            onClick={() => purchaseItem(item.id)}
                          >
                            {isPurchasing
                              ? <span className="loading loading-spinner loading-xs" />
                              : !canAfford ? "Not enough points" : "Redeem"}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Conversion ── */}
      {section === "conversion" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold">Convert Points to Cash Bonus</h2>
            <p className="text-sm text-base-content/50 mt-0.5">
              Submit a conversion request. Your manager will review and approve the payout.
            </p>
          </div>

          <div className="card border border-base-content/10 bg-base-100/40 backdrop-blur-md max-w-md">
            <div className="card-body p-5 space-y-4">
              {balance && (
                <div className="flex justify-between text-sm bg-base-200/50 rounded-lg p-3">
                  <span className="text-base-content/60">Available balance</span>
                  <span className="font-bold text-primary">{balance.spendable_points} pts</span>
                </div>
              )}
              <div className="form-control">
                <label className="label"><span className="label-text">Points to convert</span></label>
                <input
                  type="number" className="input input-bordered bg-base-200/50"
                  min={1} max={balance?.spendable_points ?? 0}
                  value={pointsToConvert}
                  onChange={(e) => setPointsToConvert(Number(e.target.value))}
                />
              </div>
              <button
                className="btn btn-primary w-full"
                disabled={
                  isConverting ||
                  pointsToConvert <= 0 ||
                  pointsToConvert > (balance?.spendable_points ?? 0)
                }
                onClick={() => requestConversion(pointsToConvert)}
              >
                {isConverting ? <span className="loading loading-spinner loading-sm" /> : "Submit Conversion Request"}
              </button>
            </div>
          </div>

          {!!conversions?.length && (
            <div className="space-y-2">
              <h3 className="font-semibold">Conversion History</h3>
              {conversions.map((conv) => {
                const { cls, label } = convStatus(conv.status);
                return (
                  <div key={conv.id}
                    className="flex justify-between items-center p-3 bg-base-100/40 rounded-xl border border-base-content/10"
                  >
                    <div className="text-sm">
                      <span className="font-semibold">{conv.points_converted} pts</span>
                      <span className="text-base-content/40 mx-2">→</span>
                      <span>{conv.cash_value}</span>
                    </div>
                    <span className={`badge badge-sm ${cls}`}>{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
