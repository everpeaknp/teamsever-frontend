import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Online Gantt Chart Tool | TeamsEver',
  description: 'Plan any project with a free online Gantt chart. Visualize timelines, track progress, manage dependencies, and collaborate with your team. No credit card required.',
  keywords: 'gantt chart, project management, timeline, project planning, task management, free gantt chart',
};

export default function GanttChartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
