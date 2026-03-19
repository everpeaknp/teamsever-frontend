# Workspace - Frontend

A modern, production-ready task management application built with Next.js 14, featuring subscription management, custom tables, document collaboration, and real-time features.

## 🚀 Features

### Core Features
- **Multi-tenant Workspaces** - Create and manage multiple workspaces with role-based access control
- **Subscription Management** - 14-day free trial with flexible plan system and usage tracking
- **Task Organization** - Kanban boards and list views for task visualization
- **Real-time Chat** - Built-in messaging system with typing indicators and presence detection
- **Direct Messaging** - Private conversations between users with attachment support
- **Document Management** - Hierarchical document structure with rich text editing
- **Custom Tables** - Excel-like tables with drag selection, color customization, and export
- **File Management** - Workspace-wide file storage with Cloudinary integration
- **Activity Tracking** - Comprehensive activity logs and audit trails
- **Push Notifications** - Firebase Cloud Messaging with smart presence detection
- **Advanced Analytics** - Performance tracking, time tracking, and workload visualization
- **Customizable Themes** - Dark/light mode with custom theme options
- **Responsive Design** - Works seamlessly on desktop and mobile devices

### Subscription System UI
- **Trial Countdown Banner** - Displays remaining trial days with upgrade prompt
- **Usage Tracking** - Real-time display of resource usage vs limits
- **Plan Comparison** - Visual plan comparison with feature highlights
- **Upgrade Flows** - Seamless upgrade experience with plan selection
- **Entitlement Checks** - User-friendly error messages when limits are reached

### Custom Tables (Pro Feature)
- **Excel-like Interface** - Click and drag to select multiple cells
- **Cell Customization** - Apply background and text colors to individual cells
- **Bulk Operations** - Apply colors to multiple selected cells at once
- **Type Validation** - Text, link, and number column types
- **Excel Export** - Export tables with color preservation
- **Inline Editing** - Edit cells directly with contentEditable
- **Permission Management** - Table-level member permissions
- **Vertical Borders** - Clear column separation

### Document Management
- **Hierarchical Structure** - Parent-child document relationships with tree view
- **Rich Text Editor** - TipTap-powered editor with tables, images, and links
- **Workspace Organization** - Documents organized by workspace
- **Archive Support** - Soft delete with archive functionality
- **Real-time Collaboration** - Multiple users can edit simultaneously

### Direct Messaging
- **Private Conversations** - One-on-one messaging between users
- **Attachment Support** - Share files in direct messages
- **Read Status** - Track message read status with indicators
- **Conversation List** - View all conversations with unread counts
- **Real-time Updates** - Instant message delivery via Socket.io

### Super Admin Dashboard
- **Plan Management** - Create and edit subscription plans with full-page forms
- **User Management** - View and manage all users and subscriptions
- **System Analytics** - Financial data, user growth, and system metrics
- **Settings Management** - Configure system-wide settings
- **Feedback Management** - View and respond to user feedback

### Advanced Features
- **Custom Fields** - Workspace-specific custom field definitions
- **Time Tracking** - Built-in time tracking with admin controls
- **Recurring Tasks** - Automated task creation with cron scheduling
- **Task Dependencies** - Visual task relationship management
- **Search** - Full-text search across workspaces
- **Announcements** - Workspace-wide announcements with cooldown
- **Activity Logs** - Detailed activity tracking and filtering

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **UI Components**: Radix UI, Headless UI
- **State Management**: React Context + Hooks
- **Forms**: React Hook Form + Zod validation
- **Drag & Drop**: @dnd-kit, @hello-pangea/dnd
- **Rich Text Editor**: TipTap
- **Real-time**: Socket.io Client
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Date Handling**: date-fns
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Authentication**: Firebase (Google OAuth)

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (see `backend/README.md`)

## 🚀 Getting Started

### Installation

```bash
# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the frontend directory:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000

# Socket.io URL (usually same as API URL)
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000

# Firebase Configuration (for Google OAuth and Push Notifications)
NEXT_PUBLIC_FIREBASE_CONFIG='{"apiKey":"your-api-key","authDomain":"your-auth-domain","projectId":"your-project-id","storageBucket":"your-storage-bucket","messagingSenderId":"your-sender-id","appId":"your-app-id"}'

# Optional: Firebase VAPID Key for Push Notifications
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key
```

### Development

```bash
# Start development server
npm run dev
```

Open [http://localhost:300](http://localhost:3000)in your browser.

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Linting

```bash
# Run ESLint
npm run lint
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── workspace/[id]/          # Workspace pages
│   │   │   ├── spaces/[spaceId]/   # Space pages with custom tables
│   │   │   ├── docs/               # Document management
│   │   │   ├── messages/           # Direct messaging
│   │   │   ├── files/              # File management
│   │   │   ├── activity-log/       # Activity logs
│   │   │   ├── analytics/          # Analytics dashboard
│   │   │   ├── settings/           # Workspace settings
│   │   │   └── chat/               # Workspace chat
│   │   ├── super-admin/            # Super admin dashboard
│   │   │   ├── plans/              # Plan management pages
│   │   │   │   ├── create/        # Create plan page
│   │   │   │   └── edit/[id]/     # Edit plan page
│   │   │   └── page.tsx           # Super admin dashboard
│   │   ├── dashboard/              # User dashboard
│   │   ├── login/                  # Authentication pages
│   │   └── layout.tsx              # Root layout
│   ├── components/                  # React components
│   │   ├── tables/                 # Custom table components
│   │   │   ├── CustomTableView.tsx # Main table component
│   │   │   ├── CellEditor.tsx      # Cell editing component
│   │   │   └── TablePermissions.tsx # Permission management
│   │   ├── documents/              # Document components
│   │   │   ├── DocumentEditor.tsx  # TipTap editor
│   │   │   ├── DocumentTree.tsx    # Hierarchical tree view
│   │   │   └── DocumentList.tsx    # Document list
│   │   ├── chat/                   # Chat system components
│   │   │   ├── ChatWindow.tsx      # Main chat interface
│   │   │   ├── MessageList.tsx     # Message display
│   │   │   └── TypingIndicator.tsx # Typing status
│   │   ├── direct-messages/        # Direct messaging components
│   │   │   ├── ConversationList.tsx # Conversation sidebar
│   │   │   ├── MessageThread.tsx   # Message thread
│   │   │   └── MessageInput.tsx    # Message input
│   │   ├── subscription/           # Subscription components
│   │   │   ├── TrialCountdownBanner.tsx # Trial banner
│   │   │   ├── PlanComparison.tsx  # Plan comparison
│   │   │   └── UsageDisplay.tsx    # Usage tracking
│   │   ├── super-admin/            # Super admin components
│   │   │   ├── PlanBuilderNew.tsx  # Plan builder
│   │   │   ├── UserManagement.tsx  # User management
│   │   │   └── SystemAnalytics.tsx # Analytics
│   │   ├── kanban/                 # Kanban board components
│   │   │   ├── Board.tsx           # Main board
│   │   │   ├── BoardColumn.tsx     # Column component
│   │   │   └── TaskCard.tsx        # Task card
│   │   ├── list-view/              # List view components
│   │   ├── sidebar/                # Navigation sidebar
│   │   ├── tasks/                  # Task management components
│   │   ├── modals/                 # Modal dialogs
│   │   └── ui/                     # Reusable UI components
│   ├── hooks/                       # Custom React hooks
│   │   ├── useCustomTable.ts       # Custom table hook
│   │   ├── useSocket.ts            # Socket.io hook
│   │   ├── useSubscription.ts      # Subscription hook
│   │   └── useAuth.ts              # Authentication hook
│   ├── lib/                         # Utility functions
│   │   ├── api.ts                  # API client
│   │   ├── socket.ts               # Socket.io client
│   │   └── utils.ts                # Helper functions
│   ├── contexts/                    # React contexts
│   │   ├── AuthContext.tsx         # Authentication context
│   │   ├── WorkspaceContext.tsx    # Workspace context
│   │   └── ThemeContext.tsx        # Theme context
│   └── types/                       # TypeScript type definitions
│       ├── workspace.ts            # Workspace types
│       ├── task.ts                 # Task types
│       ├── table.ts                # Custom table types
│       ├── document.ts             # Document types
│       └── subscription.ts         # Subscription types
├── public/                          # Static assets
│   ├── firebase-messaging-sw.js    # Service worker for push notifications
│   └── icons/                      # App icons
├── .env.local                       # Environment variables
├── next.config.js                   # Next.js configuration
├── tailwind.config.ts               # Tailwind CSS configuration
├── tsconfig.json                    # TypeScript configuration
└── package.json                     # Dependencies and scripts
```

## 🎯 Key Features Implementation

### Workspace Hierarchy
- **Structure**: Workspaces → Spaces → Lists → Tasks
- **Navigation**: Recursive sidebar with collapsible sections
- **Member Management**: Role-based access at workspace, space, and list levels
- **Permissions**: Owner, admin, and member roles with custom role support

### Custom Tables (Pro Feature)
- **Location**: `src/components/tables/CustomTableView.tsx`
- **Excel-like Selection**: Click and drag to select multiple cells
- **Color Customization**: Background and text color for cells
- **Bulk Operations**: Apply colors to all selected cells at once
- **Inline Editing**: Edit cells directly with contentEditable
- **Export**: Export to Excel with color preservation
- **Type Validation**: Text, link, and number column types
- **Permissions**: Table-level member permissions

### Document Management
- **Location**: `src/app/workspace/[id]/docs/page.tsx`
- **Rich Text Editor**: TipTap-powered editor with tables, images, and links
- **Hierarchical Structure**: Parent-child document relationships
- **Tree View**: Collapsible document tree navigation
- **Archive Support**: Soft delete with archive functionality
- **Real-time Collaboration**: Multiple users can edit simultaneously

### Direct Messaging
- **Location**: `src/app/workspace/[id]/messages/page.tsx`
- **Private Conversations**: One-on-one messaging between users
- **Conversation List**: View all conversations with unread counts
- **Attachment Support**: Share files in direct messages
- **Read Status**: Track message read status with indicators
- **Real-time Updates**: Instant message delivery via Socket.io

### Task Management
- **Multiple Views**: Kanban and List views
- **Inline Creation**: Quick task creation in any view
- **Task Details**: Sidebar with comments, activity, and attachments
- **Time Tracking**: Built-in time tracking with admin controls
- **Assignee Management**: Assign tasks to team members
- **Status & Priority**: Customizable status and priority levels
- **Dependencies**: Visual task relationship management
- **Recurring Tasks**: Automated task creation with cron scheduling

### Subscription Management
- **Trial Banner**: `src/components/subscription/TrialCountdownBanner.tsx`
- **Usage Display**: Real-time resource usage vs limits
- **Plan Comparison**: Visual plan comparison with feature highlights
- **Upgrade Flows**: Seamless upgrade experience
- **Entitlement Checks**: User-friendly error messages when limits are reached
- **Global Limits**: Usage calculated across all owned workspaces

### Super Admin Dashboard
- **Location**: `src/app/super-admin/page.tsx`
- **Plan Management**: Create and edit subscription plans
- **User Management**: View and manage all users and subscriptions
- **System Analytics**: Financial data, user growth, and system metrics
- **Settings Management**: Configure system-wide settings
- **Feedback Management**: View and respond to user feedback
- **Full-Page Forms**: Plan create/edit pages instead of modals

### Real-time Features
- **Live Chat**: Workspace-wide chat with emoji support
- **Direct Messages**: Private conversations with real-time updates
- **Typing Indicators**: Show when users are typing
- **Presence Detection**: Online/offline status for users
- **Push Notifications**: Firebase Cloud Messaging integration
- **Socket.io Integration**: Instant updates for tasks, messages, and notifications

### Analytics Dashboard
- **Location**: `src/app/workspace/[id]/analytics/page.tsx`
- **Performance Tracking**: Task completion rates and trends
- **Time Tracking**: Time spent on tasks and projects
- **Workload Visualization**: Team workload distribution
- **Charts**: Recharts-powered visualizations
- **Date Filtering**: Filter analytics by date range

### Activity Logs
- **Location**: `src/app/workspace/[id]/activity-log/page.tsx`
- **Comprehensive Tracking**: All workspace activities logged
- **Filtering**: Filter by user, action type, and date
- **Pagination**: Efficient loading of large activity logs
- **Audit Trail**: Complete audit trail for compliance

### File Management
- **Location**: `src/app/workspace/[id]/files/page.tsx`
- **Cloudinary Integration**: Secure file storage and delivery
- **Upload Progress**: Real-time upload progress indicators
- **File Preview**: Preview images and documents
- **Download**: Download files with original names
- **Delete**: Soft delete with archive functionality

## 🔄 Real-time Integration

### Socket.io Client Setup

```typescript
// src/lib/socket.ts
import { io } from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
  auth: {
    token: localStorage.getItem('token')
  }
});

// Join workspace room
socket.emit('join_workspace', { workspaceId });

// Listen for new messages
socket.on('chat:new', (message) => {
  // Handle new message
});

// Listen for notifications
socket.on('notification:new', (notification) => {
  // Handle new notification
});
```

### Push Notifications

```typescript
// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  // Firebase config
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // Handle background notification
});
```

## 🎨 Theming

### Dark Mode Support

All components support dark mode using Tailwind CSS dark mode classes:

```tsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  {/* Content */}
</div>
```

### Custom Theme Configuration

```typescript
// tailwind.config.ts
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          // ... other shades
          900: '#0c4a6e',
        },
      },
    },
  },
};
```

## 🔐 Authentication

### Firebase Authentication

```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
```

### Protected Routes

```typescript
// src/components/ProtectedRoute.tsx
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) return <LoadingSpinner />;
  if (!user) {
    router.push('/login');
    return null;
  }

  return children;
}
```

## 📊 State Management

### React Context

```typescript
// src/contexts/WorkspaceContext.tsx
import { createContext, useContext, useState } from 'react';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [workspace, setWorkspace] = useState(null);

  return (
    <WorkspaceContext.Provider value={{ workspace, setWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub repository
2. Connect repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on push to main branch

### Build Configuration

```javascript
// next.config.js
module.exports = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
  },
  images: {
    domains: ['res.cloudinary.com'], // For Cloudinary images
  },
};
```

## 🐛 Troubleshooting

### Common Issues

#### Socket.io Connection Failed
- Verify `NEXT_PUBLIC_SOCKET_URL` is correct
- Check CORS configuration in backend
- Ensure backend is running

#### Firebase Authentication Failed
- Verify Firebase configuration in `.env.local`
- Check Firebase project settings
- Ensure Google OAuth is enabled in Firebase Console

#### API Requests Failing
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check network tab for error details
- Ensure backend is running and accessible

#### Dark Mode Not Working
- Verify Tailwind CSS dark mode is configured
- Check `darkMode: 'class'` in `tailwind.config.ts`
- Ensure theme toggle is working

## 📚 Additional Resources

- **Backend API Documentation**: See `backend/README.md` for API details
- **Swagger UI**: http://localhost:5000/api-docs (when backend is running)
- **Next.js Documentation**: https://nextjs.org/docs
- **Tailwind CSS Documentation**: https://tailwindcss.com/docs
- **TipTap Documentation**: https://tiptap.dev/docs
- **Socket.io Documentation**: https://socket.io/docs

## 📝 Scripts

- `npm run dev` - Start development server (port 3001)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 📄 License

ISC

---

**Version**: 1.0.0  
**Last Updated**: March 2026  
**Maintained by**: Development Team

For backend setup and API documentation, see `backend/README.md`
