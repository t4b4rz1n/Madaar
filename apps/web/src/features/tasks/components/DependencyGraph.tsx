import React, { useMemo, useEffect } from 'react';
import { 
  ReactFlow, 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { useQuery } from '@tanstack/react-query';
import { getTasks } from '../api/tasksApi';
import { useTaskStore } from '../store/useTaskStore';
import { CustomTaskNode } from './CustomTaskNode';
import { ChecklistNode } from './ChecklistNode';
import type { Task } from '../types';

const nodeTypes = {
  task: CustomTaskNode,
  checklist: ChecklistNode,
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction, nodesep: 80, ranksep: 120 });

  nodes.forEach((node) => {
    // Approximate node sizes based on our custom node styles
    const width = node.type === 'task' ? 256 : 192;
    const height = node.type === 'task' ? 120 : 48;
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    // We are shifting the dagre node position (anchor=center) to the top left
    // so it matches React Flow's node anchor point
    const width = node.type === 'task' ? 256 : 192;
    const height = node.type === 'task' ? 120 : 48;
    
    return {
      ...node,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export const DependencyGraph: React.FC = () => {
  const { activeProjectId, activeBoardId } = useTaskStore();

  const { data: tasks } = useQuery({
    queryKey: ['tasks', activeProjectId, activeBoardId],
    queryFn: () => getTasks(activeProjectId!, activeBoardId!),
    enabled: !!activeProjectId && !!activeBoardId,
  });

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!tasks) return { initialNodes: [], initialEdges: [] };

    const rawNodes: any[] = [];
    const rawEdges: any[] = [];

    tasks.forEach((task) => {
      // 1. Add Task Node
      rawNodes.push({
        id: task.id.toString(),
        type: 'task',
        data: { task },
        position: { x: 0, y: 0 }, // Position will be calculated by dagre
      });

      // 2. Link to parent task if exists
      if (task.parent_task) {
        rawEdges.push({
          id: `e${task.parent_task}-${task.id}`,
          source: task.parent_task.toString(),
          target: task.id.toString(),
          type: 'smoothstep',
          animated: task.is_blocked,
          style: { stroke: task.is_blocked ? '#ef4444' : '#6366f1', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: task.is_blocked ? '#ef4444' : '#6366f1',
          },
        });
      }

      // 3. Add Checklist Items as sub-nodes
      if (task.checklist_items && task.checklist_items.length > 0) {
        task.checklist_items.forEach((item) => {
          const checklistNodeId = `cl-${item.id}`;
          rawNodes.push({
            id: checklistNodeId,
            type: 'checklist',
            data: { title: item.description, isCompleted: item.is_completed },
            position: { x: 0, y: 0 },
          });

          rawEdges.push({
            id: `e${task.id}-${checklistNodeId}`,
            source: task.id.toString(),
            target: checklistNodeId,
            type: 'bezier',
            animated: false,
            style: { stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '4 4' },
          });
        });
      }
    });

    const layouted = getLayoutedElements(rawNodes, rawEdges, 'TB');
    return { initialNodes: layouted.nodes, initialEdges: layouted.edges };
  }, [tasks]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div className="w-full h-[600px] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900 shadow-inner relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        attributionPosition="bottom-right"
      >
        <MiniMap 
          nodeColor={(n) => {
            if (n.type === 'checklist') return '#94a3b8';
            if (n.data?.task?.is_blocked) return '#ef4444';
            return '#6366f1';
          }}
          className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl"
          maskColor="rgba(0,0,0,0.1)"
        />
        <Controls className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl rounded-lg overflow-hidden" />
        <Background gap={24} size={2} color="#cbd5e1" className="dark:opacity-20" />
      </ReactFlow>
    </div>
  );
};
