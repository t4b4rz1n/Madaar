import React from "react";
import { motion } from "framer-motion";

const PageLoader: React.FC = () => {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-base-200/80 backdrop-blur-md">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing spinning ring */}
        <motion.div
          className="w-16 h-16 rounded-full border-4 border-t-primary border-r-primary/20 border-b-primary/10 border-l-primary/40"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />

        {/* Inner reverse-spinning ring */}
        <motion.div
          className="absolute w-10 h-10 rounded-full border-4 border-t-secondary border-r-secondary/20 border-b-secondary/10 border-l-secondary/40"
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />

        {/* Core pulsing dot */}
        <motion.div
          className="absolute w-3.5 h-3.5 rounded-full bg-primary shadow-[0_0_12px_var(--p)]"
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Loading Text */}
      <motion.p
        className="mt-6 text-xs font-bold tracking-widest text-primary/70 uppercase"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        Loading
      </motion.p>
    </div>
  );
};

export default PageLoader;
