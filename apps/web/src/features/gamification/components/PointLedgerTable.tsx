import type { PointLedger } from "../types/gamificationTypes";

interface Props {
  ledger?: PointLedger[];
  isLoading: boolean;
}

const sourceLabel: Record<string, string> = {
  SYSTEM:    "System",
  KUDOS:     "Kudos",
  QUEST:     "Quest",
  BUG_BOUNTY:"Bug Bounty",
  STORE:     "Store",
  MANUAL:    "Manual",
};

const amountClass = (amount: number) =>
  amount > 0 ? "text-success font-bold" : "text-error font-bold";

export const PointLedgerTable = ({ ledger, isLoading }: Props) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
      </div>
    );
  }

  if (!ledger?.length) {
    return (
      <div className="p-8 text-center text-base-content/50 bg-base-100/30 rounded-2xl border border-base-content/5">
        No point transactions yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-base-content/10 bg-base-100/40 backdrop-blur-md">
      <table className="table w-full">
        <thead>
          <tr className="bg-base-200/50">
            <th>Source</th>
            <th>Description</th>
            <th className="text-end">Points</th>
            <th className="text-end">Date</th>
          </tr>
        </thead>
        <tbody>
          {ledger.map((entry) => {
            const desc =
              typeof entry.description === "string"
                ? entry.description
                : entry.description?.en ?? entry.description?.fa ?? "";
            return (
              <tr key={entry.id} className="hover:bg-base-200/30 transition-colors">
                <td>
                  <span className="badge badge-outline badge-sm">{sourceLabel[entry.source] ?? entry.source}</span>
                </td>
                <td className="text-sm text-base-content/70 max-w-xs truncate">{desc}</td>
                <td className={`text-end font-mono ${amountClass(entry.amount)}`}>
                  {entry.amount > 0 ? "+" : ""}{entry.amount}
                </td>
                <td className="text-end text-xs text-base-content/50">
                  {new Date(entry.created_at).toLocaleDateString("en-GB")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
