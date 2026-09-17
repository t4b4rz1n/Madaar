import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { getLiveActivity } from '../../attendance/api/attendanceApi';

interface LiveActivityIndicatorProps {
  projectId: string;
  taskId: string | number;
}

/**
 * Renders a green animated pulse if the given task has an active timer.
 * Polling happens every 30 seconds to keep it fresh without overloading the server.
 */
export const LiveActivityIndicator: React.FC<LiveActivityIndicatorProps> = ({ projectId, taskId }) => {
  const { data: liveActivities = [] } = useQuery({
    queryKey: ['live-activity', projectId],
    queryFn: () => getLiveActivity(projectId),
    refetchInterval: 30000, // Poll every 30 seconds
    enabled: Boolean(projectId),
  });

  // Find users currently working on this specific task
  const activeUsersOnTask = liveActivities.filter(a => a.task_id.toString() === taskId.toString());

  if (activeUsersOnTask.length === 0) {
    return null;
  }

  const tooltipText = activeUsersOnTask.map(a => `${a.user.first_name || a.user.username} is working on this`).join(', ');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="relative flex items-center justify-center"
        title={tooltipText}
      >
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"></span>
        <span className="relative inline-flex h-3 w-3 rounded-full bg-success border border-white dark:border-slate-900 shadow-sm"></span>
      </motion.div>
    </AnimatePresence>
  );
};
