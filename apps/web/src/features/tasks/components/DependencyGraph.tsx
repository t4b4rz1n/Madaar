import React, { useMemo } from 'react';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Task } from '../types';
import { useQuery } from '@tanstack/react-query';
import { getTasks } from '../api/tasksApi';
import { useTaskStore } from '../store/useTaskStore';

export const DependencyGraph: React.FC = () => {
  const { activeProjectId, activeBoardId } = useTaskStore();

  const { data: tasks } = useQuery({
    queryKey: ['tasks', activeProjectId, activeBoardId],
    queryFn: () => getTasks(activeProjectId!, activeBoardId!),
    enabled: !!activeProjectId && !!activeBoardId,
  });

  const initialNodes = useMemo(() => {
    if (!tasks) return [];
    return tasks.map((task, index) => ({
      id: task.id.toString(),
      data: { 
        label: (
          <div className="p-2 w-48 text-right bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="text-xs font-bold text-slate-500 mb-1">{task.key}</div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{task.title}</div>
            {task.is_blocked && <div className="text-xs text-red-500 mt-1">Blocked</div>}
          </div>
        )
      },
      position: { x: (index % 3) * 250, y: Math.floor(index / 3) * 150 },
    }));
  }, [tasks]);

  const initialEdges = useMemo(() => {
    const edges: any[] = [];
    if (!tasks) return edges;
    tasks.forEach(task => {
      if (task.parent_task) {
        edges.push({
          id: `e${task.parent_task}-${task.id}`,
          source: task.parent_task.toString(),
          target: task.id.toString(),
          animated: true,
          style: { stroke: task.is_blocked ? '#ef4444' : '#6366f1' }
        });
      }
    });
    return edges;
  }, [tasks]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update when tasks change
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div className="w-full h-[600px] border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900/50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};
