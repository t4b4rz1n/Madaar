import { motion } from "motion/react";
import type { UserBadge } from "../types/gamificationTypes";
import { Award } from "iconsax-reactjs";

interface Props {
  badges?: UserBadge[];
  isLoading: boolean;
}

export const BadgeShowcase = ({ badges, isLoading }: Props) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-32 rounded-xl"></div>
        ))}
      </div>
    );
  }

  if (!badges || badges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-base-content/50 bg-base-100/30 rounded-2xl border border-base-content/5">
        <Award size={48} className="mb-4 opacity-50" />
        <p>No badges earned yet. Keep up the great work!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {badges.map((userBadge, index) => (
        <motion.div
          key={userBadge.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ y: -5, scale: 1.02 }}
          className="flex flex-col items-center p-6 bg-base-100/60 backdrop-blur-md rounded-2xl border border-base-content/10 text-center shadow-sm hover:shadow-md transition-all cursor-default"
        >
          {userBadge.badge.icon ? (
            <img src={userBadge.badge.icon} alt={userBadge.badge.name} className="w-16 h-16 object-contain mb-3" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-3">
              <Award size={32} variant="Bold" />
            </div>
          )}
          <h4 className="font-semibold text-sm mb-1">{userBadge.badge.name}</h4>
          {userBadge.badge.description && (
            <p className="text-xs text-base-content/60 line-clamp-2">{userBadge.badge.description}</p>
          )}
        </motion.div>
      ))}
    </div>
  );
};
