import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTaskStore } from '../store/useTaskStore';
import { ArrowDown2 } from 'iconsax-reactjs';
import { getProjects } from '../../projects/api/projectsApi';
import type { Project } from '../../projects/types';

const PROJECT_COLORS = ['#ef4444', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6'];

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
  const activeDotColor = PROJECT_COLORS[activeIndex % PROJECT_COLORS.length];

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
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors
          text-base-content hover:bg-base-200"
      >
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: activeDotColor }}
        ></span>
        <span>{activeProject?.name || 'Select Project'}</span>
        <ArrowDown2
          size={14}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-base-100 border border-base-300 rounded-xl shadow-xl z-[101] py-1 overflow-hidden">
          <div className="px-3 py-2 text-xs font-semibold text-base-content/40 uppercase tracking-wider">
            Projects
          </div>
          {projects?.map((p: Project, index: number) => {
            const dotColor = PROJECT_COLORS[index % PROJECT_COLORS.length];
            const isActive = p.id === activeProjectId;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setActiveProject(String(p.id));
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-base-content hover:bg-base-200'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: dotColor }}
                ></span>
                <span className="truncate">{p.name}</span>
              </button>
            );
          })}
          {(!projects || projects.length === 0) && (
            <div className="px-3 py-3 text-xs text-base-content/55">No projects available</div>
          )}
        </div>
      )}
    </div>
  );
};
