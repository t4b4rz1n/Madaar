import { motion } from "framer-motion";
import React from "react";

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.995 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5 },
  },
};

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    // bg-base-200: Standard page background from theme
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor - Uses Primary/Secondary colors with low opacity */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-40 -top-40 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -right-40 -bottom-40 w-[500px] h-[500px] rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        // bg-base-100: Card background (usually white in light mode)
        className="relative z-10 w-full max-w-md p-6 sm:p-10 bg-base-100 rounded-2xl shadow-xl border border-base-300"
      >
        {children}
      </motion.div>
    </div>
  );
};
