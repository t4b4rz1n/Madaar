import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTaskStore } from '../store/useTaskStore';
import { ArrowDown2, TickCircle, Folder } from 'iconsax-reactjs';
import { getProjects } from '../../projects/api/projectsApi';
import type { Project } from '../../projects/types';

const PASTEL_COLORS = ['#b39ddb', '#9fa8da', '#81d4fa', '#80cbc4', '#a5d6a7', '#ffcc80', '#f48fb1', '#ce93d8'];

const getProjectColor = (project?: Project | null, index = 0): string => {
  if (!project?.color) return PASTEL_COLORS[index % PASTEL_COLORS.length];
  if (project.color.startsWith('#')) return project.color;
  const hexMatch = project.color.match(/#[0-9a-fA-F]{3,8}/);
  return hexMatch ? hexMatch[0] : PASTEL_COLORS[index % PASTEL_COLORS.length];
};

export const GlobalProjectSelector: React.FC = () => {
  const { activeProjectId, setActiveProject } = useTaskStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects(),
  });

  const activeProject = projects?.find((p: Project) => String(p.id) === String(activeProjectId)) || projects?.[0];
  const activeIndex = projects?.findIndex((p: any) => String(p.id) === String(activeProject?.id)) ?? 0;
  const activeColor = getProjectColor(activeProject, activeIndex);

  React.useEffect(() => {
    if (isLoading) return;

    if (!projects || projects.length === 0) {
      if (activeProjectId) setActiveProject(null);
      return;
    }

    const hasActiveProject = projects.some((project: Project) => String(project.id) === String(activeProjectId));
    if (!hasActiveProject) setActiveProject(String(projects[0].id));
  }, [projects, isLoading, activeProjectId, setActiveProject]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative z-[100]" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9.5 items-center gap-2.5 rounded-xl border border-base-content/10 bg-base-100 px-3.5 text-xs font-bold text-base-content shadow-xs transition-all hover:border-primary/40 hover:bg-base-200/50"
      >
        <span
          className="size-3.5 rounded-full shrink-0 shadow-xs transition-transform duration-200"
          style={{
            background: `linear-gradient(135deg, ${activeColor}, ${activeColor}dd)`,
            boxShadow: `0 0 10px ${activeColor}60`,
          }}
        />
        {activeProject?.prefix && (
          <span
            className="rounded-md px-1.5 py-0.5 text-[10px] font-extrabold text-white"
            style={{ background: activeColor }}
          >
            {activeProject.prefix}
          </span>
        )}
        <span dir="auto" className="truncate max-w-[140px] text-xs font-bold">
          {activeProject?.name || 'Select Project'}
        </span>
        <ArrowDown2
          size={14}
          className={`shrink-0 text-base-content/50 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 rounded-2xl border border-base-content/10 bg-base-100 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in duration-100 z-[101]">
          <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-base-content/40 border-b border-base-content/8 mb-1">
            <Folder size={13} className="text-primary" />
            <span>Select Active Project</span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
            {projects?.map((p: Project, index: number) => {
              const color = getProjectColor(p, index);
              const isActive = String(p.id) === String(activeProject?.id);

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setActiveProject(String(p.id));
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-left transition-all ${
                    isActive
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-base-content/80 hover:bg-base-200/60 hover:text-base-content font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="size-3.5 rounded-full shrink-0 shadow-xs"
                      style={{
                        background: `linear-gradient(135deg, ${color}, ${color}dd)`,
                        boxShadow: `0 0 6px ${color}50`,
                      }}
                    />
                    {p.prefix && (
                      <span
                        className="rounded-md px-1.5 py-0.5 text-[9px] font-extrabold text-white shrink-0"
                        style={{ background: color }}
                      >
                        {p.prefix}
                      </span>
                    )}
                    <span dir="auto" className="truncate text-xs">
                      {p.name}
                    </span>
                  </div>

                  {isActive && (
                    <TickCircle size={15} className="shrink-0 text-primary" />
                  )}
                </button>
              );
            })}

            {(!projects || projects.length === 0) && (
              <div className="px-3 py-4 text-center text-xs text-base-content/40">
                No projects found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
