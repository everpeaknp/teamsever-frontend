'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Task } from '@/types';

interface ProjectHealthProps {
  spaces: any[];
  tasks: Task[];
}

export function ProjectHealth({ spaces, tasks }: ProjectHealthProps) {
  const projectStats = useMemo(() => {
    return spaces.map(space => {
      const spaceTasks = tasks.filter(t => t.space === space._id);
      const completedTasks = spaceTasks.filter(t => t.status === 'done').length;
      const progress = spaceTasks.length > 0 
        ? Math.round((completedTasks / spaceTasks.length) * 100) 
        : 0;
      
      return {
        name: space.name,
        progress,
        color: space.color || '#ec5b13',
        totalTasks: spaceTasks.length,
        completedTasks,
      };
    });
  }, [spaces, tasks]);

  return (
    <Card>
      <div className="px-6 py-4 border-b">
        <h4 className="font-bold">Project Health</h4>
        <p className="text-xs text-muted-foreground mt-1">All {projectStats.length} spaces</p>
      </div>
      <CardContent className="p-6 space-y-6 max-h-[400px] overflow-y-auto">
        {projectStats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No projects</p>
          </div>
        ) : (
          projectStats.map((project, index) => (
            <div key={index}>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold truncate flex-1">{project.name}</span>
                <span className="text-sm font-bold ml-2" style={{ color: project.color }}>
                  {project.progress}%
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{project.completedTasks} / {project.totalTasks} tasks</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all" 
                  style={{ 
                    width: `${project.progress}%`,
                    backgroundColor: project.color 
                  }}
                ></div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
