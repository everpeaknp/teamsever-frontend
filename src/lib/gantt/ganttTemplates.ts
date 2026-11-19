type TemplateTask = { name: string; duration: number; after?: string[] };

export type GanttTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'Tech' | 'Business' | 'Events' | 'Education' | 'General';
  phases: { name: string; tasks: TemplateTask[] }[];
};

export const GANTT_TEMPLATES: GanttTemplate[] = [
  // Existing templates with categories added
  {
    id: 'software',
    name: 'Software Development',
    icon: 'Code2',
    description: 'Plan, build, test, and ship a software release.',
    category: 'Tech',
    phases: [
      { name: 'Planning', tasks: [{ name: 'Requirements gathering', duration: 5 }, { name: 'Technical design', duration: 4 }, { name: 'Sprint planning', duration: 1 }] },
      { name: 'Development', tasks: [{ name: 'Backend API', duration: 10 }, { name: 'Frontend UI', duration: 10, after: ['Sprint planning'] }, { name: 'Integration', duration: 4, after: ['Backend API', 'Frontend UI'] }] },
      { name: 'Testing', tasks: [{ name: 'QA testing', duration: 5 }, { name: 'Bug fixing', duration: 4 }, { name: 'User acceptance testing', duration: 3 }] },
      { name: 'Release', tasks: [{ name: 'Deployment', duration: 1 }, { name: 'Release', duration: 0 }] },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing Campaign',
    icon: 'Megaphone',
    description: 'Research, create, launch, and measure a campaign.',
    category: 'Business',
    phases: [
      { name: 'Strategy', tasks: [{ name: 'Market research', duration: 5 }, { name: 'Define audience and goals', duration: 2 }, { name: 'Budget approval', duration: 0 }] },
      { name: 'Creative', tasks: [{ name: 'Copywriting', duration: 5 }, { name: 'Design assets', duration: 6, after: ['Budget approval'] }, { name: 'Creative review', duration: 2, after: ['Copywriting', 'Design assets'] }] },
      { name: 'Execution', tasks: [{ name: 'Set up channels', duration: 3 }, { name: 'Campaign launch', duration: 0 }, { name: 'Run ads and social', duration: 15 }] },
      { name: 'Analysis', tasks: [{ name: 'Track metrics', duration: 10, after: ['Campaign launch'] }, { name: 'Final report', duration: 3, after: ['Run ads and social', 'Track metrics'] }] },
    ],
  },
  {
    id: 'product-launch',
    name: 'Product Launch',
    icon: 'Rocket',
    description: 'Take a product from beta to a public launch.',
    category: 'Business',
    phases: [
      { name: 'Preparation', tasks: [{ name: 'Positioning and messaging', duration: 4 }, { name: 'Pricing strategy', duration: 3 }, { name: 'Beta program', duration: 10 }] },
      { name: 'Assets', tasks: [{ name: 'Landing page', duration: 6, after: ['Pricing strategy'] }, { name: 'Demo video', duration: 5, after: ['Beta program'] }, { name: 'Press kit', duration: 3, after: ['Beta program'] }] },
      { name: 'Launch', tasks: [{ name: 'Press outreach', duration: 5, after: ['Press kit'] }, { name: 'Launch day', duration: 0, after: ['Landing page', 'Demo video', 'Press outreach'] }, { name: 'Post-launch follow-up', duration: 5 }] },
    ],
  },
  {
    id: 'event',
    name: 'Event Planning',
    icon: 'CalendarDays',
    description: 'Organize a conference, meetup, or celebration.',
    category: 'Events',
    phases: [
      { name: 'Planning', tasks: [{ name: 'Define event goals', duration: 2 }, { name: 'Set budget', duration: 2 }, { name: 'Book venue', duration: 5 }] },
      { name: 'Logistics', tasks: [{ name: 'Hire vendors', duration: 7 }, { name: 'Catering', duration: 5, after: ['Book venue'] }, { name: 'Speakers and agenda', duration: 8, after: ['Book venue'] }] },
      { name: 'Promotion', tasks: [{ name: 'Invitations and registration', duration: 10, after: ['Speakers and agenda'] }, { name: 'Event day', duration: 0, after: ['Hire vendors', 'Catering', 'Invitations and registration'] }, { name: 'Post-event survey', duration: 3 }] },
    ],
  },
  {
    id: 'website',
    name: 'Website Redesign',
    icon: 'MonitorSmartphone',
    description: 'Discover, design, build, and launch a new site.',
    category: 'Tech',
    phases: [
      { name: 'Discovery', tasks: [{ name: 'Stakeholder interviews', duration: 3 }, { name: 'Content audit', duration: 4 }, { name: 'Sitemap and wireframes', duration: 5 }] },
      { name: 'Design', tasks: [{ name: 'Visual design', duration: 8 }, { name: 'Design review', duration: 2 }] },
      { name: 'Build', tasks: [{ name: 'Front-end development', duration: 12 }, { name: 'Content migration', duration: 8, after: ['Design review'] }, { name: 'QA and accessibility', duration: 5, after: ['Front-end development', 'Content migration'] }] },
      { name: 'Launch', tasks: [{ name: 'Go live', duration: 0 }, { name: 'Post-launch fixes', duration: 5 }] },
    ],
  },
  {
    id: 'construction',
    name: 'Construction Project',
    icon: 'HardHat',
    description: 'From permits and foundations to final handover.',
    category: 'Business',
    phases: [
      { name: 'Pre-construction', tasks: [{ name: 'Site survey', duration: 5 }, { name: 'Permits and approvals', duration: 15 }, { name: 'Contractor bidding', duration: 10, after: ['Site survey'] }] },
      { name: 'Construction', tasks: [{ name: 'Foundation', duration: 15, after: ['Permits and approvals', 'Contractor bidding'] }, { name: 'Framing', duration: 20 }, { name: 'Roofing', duration: 10 }, { name: 'Plumbing and electrical', duration: 15, after: ['Framing'] }, { name: 'Interior finishing', duration: 20, after: ['Roofing', 'Plumbing and electrical'] }] },
      { name: 'Closeout', tasks: [{ name: 'Final inspection', duration: 3 }, { name: 'Handover', duration: 0 }] },
    ],
  },
  {
    id: 'research',
    name: 'Research Project',
    icon: 'FlaskConical',
    description: 'A thesis or study, from proposal to submission.',
    category: 'Education',
    phases: [
      { name: 'Proposal', tasks: [{ name: 'Literature review', duration: 10 }, { name: 'Research proposal', duration: 5 }, { name: 'Ethics approval', duration: 0 }] },
      { name: 'Research', tasks: [{ name: 'Data collection', duration: 20 }, { name: 'Data analysis', duration: 10 }] },
      { name: 'Writing', tasks: [{ name: 'First draft', duration: 15 }, { name: 'Peer review', duration: 5 }, { name: 'Revisions', duration: 5 }, { name: 'Submission', duration: 0 }] },
    ],
  },
  {
    id: 'blank',
    name: 'Blank Chart',
    icon: 'Plus',
    description: 'Start from a single task and build it yourself.',
    category: 'General',
    phases: [{ name: 'Phase 1', tasks: [{ name: 'First task', duration: 5 }] }],
  },
  // New templates
  {
    id: 'mobile-app',
    name: 'Mobile App Development',
    icon: 'Smartphone',
    description: 'Design, develop, test, and launch a mobile application.',
    category: 'Tech',
    phases: [
      { name: 'Planning', tasks: [{ name: 'Define app features', duration: 4 }, { name: 'Platform selection', duration: 2 }, { name: 'Technical architecture', duration: 3 }] },
      { name: 'Design', tasks: [{ name: 'UI/UX wireframes', duration: 5, after: ['Platform selection'] }, { name: 'Design mockups', duration: 6, after: ['UI/UX wireframes'] }, { name: 'Design approval', duration: 1, after: ['Design mockups'] }] },
      { name: 'Development', tasks: [{ name: 'Core features', duration: 15, after: ['Technical architecture', 'Design approval'] }, { name: 'API integration', duration: 8, after: ['Core features'] }, { name: 'Testing', duration: 7, after: ['API integration'] }] },
      { name: 'Launch', tasks: [{ name: 'Beta testing', duration: 10, after: ['Testing'] }, { name: 'App store submission', duration: 3, after: ['Beta testing'] }, { name: 'Public release', duration: 0, after: ['App store submission'] }] },
    ],
  },
  {
    id: 'agile-sprint',
    name: 'Agile Sprint',
    icon: 'Zap',
    description: 'A two-week sprint cycle with planning, daily standups, and retrospective.',
    category: 'Tech',
    phases: [
      { name: 'Planning', tasks: [{ name: 'Sprint planning', duration: 1 }, { name: 'Story refinement', duration: 1 }] },
      { name: 'Execution', tasks: [{ name: 'Development sprint', duration: 8, after: ['Story refinement'] }, { name: 'Code reviews', duration: 2, after: ['Development sprint'] }, { name: 'Testing', duration: 2, after: ['Code reviews'] }] },
      { name: 'Review', tasks: [{ name: 'Sprint demo', duration: 1, after: ['Testing'] }, { name: 'Retrospective', duration: 1, after: ['Sprint demo'] }] },
    ],
  },
  {
    id: 'thesis',
    name: 'Master\'s Thesis',
    icon: 'GraduationCap',
    description: 'Complete a graduate thesis from topic selection to defense.',
    category: 'Education',
    phases: [
      { name: 'Preparation', tasks: [{ name: 'Topic selection', duration: 7 }, { name: 'Literature review', duration: 14 }, { name: 'Research proposal', duration: 10, after: ['Literature review'] }, { name: 'Proposal defense', duration: 0, after: ['Research proposal'] }] },
      { name: 'Research', tasks: [{ name: 'Methodology design', duration: 7, after: ['Proposal defense'] }, { name: 'Data collection', duration: 30, after: ['Methodology design'] }, { name: 'Data analysis', duration: 21, after: ['Data collection'] }] },
      { name: 'Writing', tasks: [{ name: 'Draft chapters', duration: 35, after: ['Data analysis'] }, { name: 'Advisor review', duration: 7, after: ['Draft chapters'] }, { name: 'Revisions', duration: 14, after: ['Advisor review'] }, { name: 'Final submission', duration: 0, after: ['Revisions'] }] },
      { name: 'Defense', tasks: [{ name: 'Defense preparation', duration: 7, after: ['Final submission'] }, { name: 'Thesis defense', duration: 0, after: ['Defense preparation'] }] },
    ],
  },
  {
    id: 'startup-launch',
    name: 'Startup Launch',
    icon: 'TrendingUp',
    description: 'Launch a startup from MVP to first customers.',
    category: 'Business',
    phases: [
      { name: 'Foundation', tasks: [{ name: 'Business plan', duration: 7 }, { name: 'Market validation', duration: 10 }, { name: 'Legal setup', duration: 5, after: ['Business plan'] }, { name: 'Funding pitch', duration: 7, after: ['Market validation'] }] },
      { name: 'Build', tasks: [{ name: 'MVP development', duration: 30, after: ['Legal setup'] }, { name: 'Brand identity', duration: 10, after: ['Funding pitch'] }, { name: 'Landing page', duration: 5, after: ['Brand identity'] }] },
      { name: 'Launch', tasks: [{ name: 'Beta program', duration: 14, after: ['MVP development', 'Landing page'] }, { name: 'Product launch', duration: 0, after: ['Beta program'] }, { name: 'Early customer outreach', duration: 21, after: ['Product launch'] }] },
    ],
  },
  {
    id: 'content-calendar',
    name: 'Content Calendar',
    icon: 'FileText',
    description: 'Plan and execute a quarter of content marketing.',
    category: 'Business',
    phases: [
      { name: 'Strategy', tasks: [{ name: 'Content audit', duration: 3 }, { name: 'Topic research', duration: 5 }, { name: 'Editorial calendar', duration: 2, after: ['Topic research'] }] },
      { name: 'Production', tasks: [{ name: 'Write blog posts', duration: 30, after: ['Editorial calendar'] }, { name: 'Create graphics', duration: 15, after: ['Editorial calendar'] }, { name: 'Edit and review', duration: 10, after: ['Write blog posts'] }] },
      { name: 'Distribution', tasks: [{ name: 'Schedule posts', duration: 2, after: ['Edit and review', 'Create graphics'] }, { name: 'Social promotion', duration: 60, after: ['Schedule posts'] }, { name: 'Email newsletter', duration: 15, after: ['Schedule posts'] }] },
      { name: 'Analysis', tasks: [{ name: 'Track engagement', duration: 90, after: ['Social promotion'] }, { name: 'Quarterly report', duration: 3, after: ['Track engagement'] }] },
    ],
  },
  {
    id: 'hiring',
    name: 'Hiring Process',
    icon: 'Users',
    description: 'Recruit, interview, and onboard a new team member.',
    category: 'Business',
    phases: [
      { name: 'Preparation', tasks: [{ name: 'Define role', duration: 2 }, { name: 'Write job description', duration: 2 }, { name: 'Post job listings', duration: 1, after: ['Write job description'] }] },
      { name: 'Screening', tasks: [{ name: 'Review applications', duration: 7, after: ['Post job listings'] }, { name: 'Phone screens', duration: 5, after: ['Review applications'] }, { name: 'Shortlist candidates', duration: 1, after: ['Phone screens'] }] },
      { name: 'Interviews', tasks: [{ name: 'Technical interviews', duration: 7, after: ['Shortlist candidates'] }, { name: 'Cultural fit interviews', duration: 5, after: ['Technical interviews'] }, { name: 'Final decision', duration: 2, after: ['Cultural fit interviews'] }] },
      { name: 'Onboarding', tasks: [{ name: 'Offer and negotiation', duration: 3, after: ['Final decision'] }, { name: 'Prepare workspace', duration: 5, after: ['Offer and negotiation'] }, { name: 'First day', duration: 0, after: ['Prepare workspace'] }, { name: 'Training period', duration: 10, after: ['First day'] }] },
    ],
  },
  {
    id: 'training',
    name: 'Training Program',
    icon: 'BookOpen',
    description: 'Design and deliver a professional training course.',
    category: 'Education',
    phases: [
      { name: 'Design', tasks: [{ name: 'Needs assessment', duration: 3 }, { name: 'Learning objectives', duration: 2 }, { name: 'Course outline', duration: 3, after: ['Learning objectives'] }, { name: 'Create materials', duration: 10, after: ['Course outline'] }] },
      { name: 'Preparation', tasks: [{ name: 'Schedule sessions', duration: 2, after: ['Create materials'] }, { name: 'Reserve venue', duration: 3, after: ['Schedule sessions'] }, { name: 'Send invitations', duration: 1, after: ['Schedule sessions'] }] },
      { name: 'Delivery', tasks: [{ name: 'Training sessions', duration: 5, after: ['Reserve venue', 'Send invitations'] }, { name: 'Q&A and support', duration: 3, after: ['Training sessions'] }] },
      { name: 'Evaluation', tasks: [{ name: 'Participant feedback', duration: 2, after: ['Q&A and support'] }, { name: 'Update materials', duration: 3, after: ['Participant feedback'] }] },
    ],
  },
  {
    id: 'wedding',
    name: 'Wedding Planning',
    icon: 'Heart',
    description: 'Plan your special day from engagement to reception.',
    category: 'Events',
    phases: [
      { name: 'Early Planning', tasks: [{ name: 'Set budget', duration: 3 }, { name: 'Guest list', duration: 5 }, { name: 'Book venue', duration: 7, after: ['Set budget'] }, { name: 'Choose date', duration: 1, after: ['Book venue'] }] },
      { name: 'Vendors', tasks: [{ name: 'Hire photographer', duration: 7, after: ['Choose date'] }, { name: 'Book catering', duration: 10, after: ['Choose date'] }, { name: 'Select florist', duration: 5, after: ['Choose date'] }, { name: 'Hire entertainment', duration: 7, after: ['Choose date'] }] },
      { name: 'Details', tasks: [{ name: 'Send invitations', duration: 3, after: ['Guest list', 'Hire photographer'] }, { name: 'Wedding attire', duration: 14, after: ['Choose date'] }, { name: 'Plan ceremony', duration: 7, after: ['Send invitations'] }, { name: 'Rehearsal', duration: 1, after: ['Plan ceremony', 'Wedding attire', 'Hire entertainment'] }] },
      { name: 'Celebration', tasks: [{ name: 'Wedding day', duration: 0, after: ['Rehearsal', 'Book catering', 'Select florist'] }, { name: 'Honeymoon', duration: 7, after: ['Wedding day'] }] },
    ],
  },
  {
    id: 'office-relocation',
    name: 'Office Relocation',
    icon: 'Building2',
    description: 'Move your office to a new location with minimal disruption.',
    category: 'Business',
    phases: [
      { name: 'Planning', tasks: [{ name: 'Find new space', duration: 14 }, { name: 'Lease negotiation', duration: 7, after: ['Find new space'] }, { name: 'Move budget', duration: 2, after: ['Lease negotiation'] }, { name: 'Timeline planning', duration: 3, after: ['Move budget'] }] },
      { name: 'Preparation', tasks: [{ name: 'Hire movers', duration: 5, after: ['Timeline planning'] }, { name: 'IT setup', duration: 10, after: ['Lease negotiation'] }, { name: 'Furniture planning', duration: 7, after: ['Lease negotiation'] }, { name: 'Pack non-essentials', duration: 7, after: ['Hire movers'] }] },
      { name: 'Move', tasks: [{ name: 'Final packing', duration: 2, after: ['Pack non-essentials', 'IT setup'] }, { name: 'Moving day', duration: 1, after: ['Final packing', 'Furniture planning'] }, { name: 'Unpack and setup', duration: 3, after: ['Moving day'] }] },
      { name: 'Settling In', tasks: [{ name: 'Address updates', duration: 2, after: ['Moving day'] }, { name: 'Final touches', duration: 5, after: ['Unpack and setup'] }] },
    ],
  },
  {
    id: 'product-design',
    name: 'Product Design Sprint',
    icon: 'Palette',
    description: 'A focused design sprint from research to prototype.',
    category: 'Tech',
    phases: [
      { name: 'Understand', tasks: [{ name: 'User research', duration: 3 }, { name: 'Define problem', duration: 2 }, { name: 'Set goals', duration: 1, after: ['Define problem'] }] },
      { name: 'Ideate', tasks: [{ name: 'Sketching ideas', duration: 2, after: ['Set goals'] }, { name: 'Review concepts', duration: 1, after: ['Sketching ideas'] }, { name: 'Select direction', duration: 1, after: ['Review concepts'] }] },
      { name: 'Prototype', tasks: [{ name: 'Create wireframes', duration: 3, after: ['Select direction'] }, { name: 'Build prototype', duration: 5, after: ['Create wireframes'] }] },
      { name: 'Test', tasks: [{ name: 'User testing', duration: 3, after: ['Build prototype'] }, { name: 'Analyze feedback', duration: 2, after: ['User testing'] }, { name: 'Final recommendations', duration: 1, after: ['Analyze feedback'] }] },
    ],
  },
];
