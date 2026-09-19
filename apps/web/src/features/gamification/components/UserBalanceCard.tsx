import { WalletMoney, Star, MedalStar } from "iconsax-reactjs";
import { motion } from "motion/react";
import type { UserPointBalance } from "../types/gamificationTypes";

interface Props {
  balance?: UserPointBalance;
  isLoading: boolean;
}

export const UserBalanceCard = ({ balance, isLoading }: Props) => {
  if (isLoading) {
    return <div className="skeleton h-32 w-full rounded-2xl"></div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-base-100/40 backdrop-blur-md border border-base-content/10 shadow-sm"
    >
      <div className="card-body flex-row flex-wrap justify-around items-center p-6 gap-4">
        
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Star variant="Bold" size={32} />
          </div>
          <div>
            <p className="text-sm text-base-content/70">Total Points</p>
            <p className="text-2xl font-bold">{balance?.total_points || 0}</p>
          </div>
        </div>

        <div className="hidden sm:block w-px h-12 bg-base-content/10"></div>

        <div className="flex items-center gap-4">
          <div className="p-3 bg-secondary/10 text-secondary rounded-xl">
            <WalletMoney variant="Bold" size={32} />
          </div>
          <div>
            <p className="text-sm text-base-content/70">Spendable Points</p>
            <p className="text-2xl font-bold">{balance?.spendable_points || 0}</p>
          </div>
        </div>

        <div className="hidden sm:block w-px h-12 bg-base-content/10"></div>

        <div className="flex items-center gap-4">
          <div className="p-3 bg-accent/10 text-accent rounded-xl">
            <MedalStar variant="Bold" size={32} />
          </div>
          <div>
            <p className="text-sm text-base-content/70">Kudos Budget</p>
            <p className="text-2xl font-bold">{balance?.kudos_budget || 0} / month</p>
          </div>
        </div>

      </div>
    </motion.div>
  );
};
