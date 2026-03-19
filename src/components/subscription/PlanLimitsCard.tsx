"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Users, Shield, MessageSquare, Zap, FolderOpen, List, CheckSquare, Layout } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { Progress } from "@/components/ui/progress";

interface PlanLimitsCardProps {
  workspaceCount: number;
  onUpgrade: () => void;
}

export default function PlanLimitsCard({ workspaceCount, onUpgrade }: PlanLimitsCardProps) {
  const { subscription, loading } = useSubscription();

  if (loading || !subscription) return null;

  const plan = subscription.plan;
  const usage = subscription.usage;
  const isPaid = subscription.isPaid;
  const planName = plan?.name || "Free";
  
  // Get all features
  const maxWorkspaces = plan?.features.maxWorkspaces ?? 1;
  const maxSpaces = plan?.features.maxSpaces ?? 2;
  const maxLists = plan?.features.maxLists ?? 4;
  const maxFolders = plan?.features.maxFolders ?? 2;
  const maxTasks = plan?.features.maxTasks ?? 100;
  
  // Get member limit from purchased count (for paid users) or default for free users
  // For paid users: use memberCount from subscription (set during purchase)
  // For free users: default to 5 members
  const maxMembers = subscription?.isPaid && subscription?.memberCount 
    ? subscription.memberCount 
    : 5; // Free plan default
  
  const maxAdmins = plan?.features.maxAdmins ?? 1;
  const hasAccessControl = plan?.features.hasAccessControl || false;
  const accessControlTier = plan?.features.accessControlTier || 'none';
  const hasGroupChat = plan?.features.hasGroupChat || false;
  const messageLimit = plan?.features.messageLimit ?? 100;
  const announcementCooldown = plan?.features.announcementCooldown ?? 24;

  // Calculate percentages
  const workspacePercentage = maxWorkspaces === -1 ? 0 : (workspaceCount / maxWorkspaces) * 100;
  const spacePercentage = maxSpaces === -1 ? 0 : ((usage?.spaces || 0) / maxSpaces) * 100;
  const listPercentage = maxLists === -1 ? 0 : ((usage?.lists || 0) / maxLists) * 100;
  const folderPercentage = maxFolders === -1 ? 0 : ((usage?.folders || 0) / maxFolders) * 100;
  const taskPercentage = maxTasks === -1 ? 0 : ((usage?.tasks || 0) / maxTasks) * 100;

  const isWorkspaceLimitClose = workspacePercentage >= 80;
  const isSpaceLimitClose = spacePercentage >= 80;
  const isListLimitClose = listPercentage >= 80;

  return (
    <Card className="border-gray-200 dark:border-gray-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {planName} Plan
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isPaid ? 'Active subscription' : `${subscription.daysRemaining} days trial remaining`}
            </p>
          </div>
          {!isPaid && (
            <button
              onClick={onUpgrade}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              Upgrade
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Workspaces */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Workspaces</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {workspaceCount} / {maxWorkspaces === -1 ? '∞' : maxWorkspaces}
              </span>
            </div>
            {maxWorkspaces !== -1 && (
              <Progress 
                value={workspacePercentage} 
                className={`h-2 ${isWorkspaceLimitClose ? 'bg-red-100 dark:bg-red-900/20' : ''}`}
              />
            )}
          </div>

          {/* Spaces */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Layout className="w-4 h-4 text-indigo-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Spaces</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {usage?.spaces || 0} / {maxSpaces === -1 ? '∞' : maxSpaces}
              </span>
            </div>
            {maxSpaces !== -1 && (
              <Progress 
                value={spacePercentage} 
                className={`h-2 ${isSpaceLimitClose ? 'bg-red-100 dark:bg-red-900/20' : ''}`}
              />
            )}
          </div>

          {/* Lists */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-cyan-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Lists</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {usage?.lists || 0} / {maxLists === -1 ? '∞' : maxLists}
              </span>
            </div>
            {maxLists !== -1 && (
              <Progress 
                value={listPercentage} 
                className={`h-2 ${isListLimitClose ? 'bg-red-100 dark:bg-red-900/20' : ''}`}
              />
            )}
          </div>

          {/* Folders */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Folders</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {usage?.folders || 0} / {maxFolders === -1 ? '∞' : maxFolders}
              </span>
            </div>
            {maxFolders !== -1 && (
              <Progress 
                value={folderPercentage} 
                className={`h-2 ${folderPercentage >= 80 ? 'bg-red-100 dark:bg-red-900/20' : ''}`}
              />
            )}
          </div>

          {/* Tasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Tasks</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {usage?.tasks || 0} / {maxTasks === -1 ? '∞' : maxTasks}
              </span>
            </div>
            {maxTasks !== -1 && (
              <Progress 
                value={taskPercentage} 
                className={`h-2 ${taskPercentage >= 80 ? 'bg-red-100 dark:bg-red-900/20' : ''}`}
              />
            )}
          </div>

          {/* Members */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Max Members</span>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {maxMembers === -1 ? 'Unlimited' : maxMembers}
            </span>
          </div>

          {/* Admins */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Max Admins</span>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {maxAdmins === -1 ? 'Unlimited' : maxAdmins}
            </span>
          </div>

          {/* Access Control - Only show if enabled */}
          {hasAccessControl && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-violet-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Access Control</span>
              </div>
              <span className="text-sm font-medium text-green-600 dark:text-green-400 capitalize">
                {accessControlTier}
              </span>
            </div>
          )}

          {/* Group Chat - Only show if enabled */}
          {hasGroupChat && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Group Chat</span>
                </div>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  Enabled
                </span>
              </div>

              {/* Message Limit - Only show if group chat is enabled */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Messages</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {messageLimit === -1 ? 'Unlimited' : `${messageLimit}/month`}
                </span>
              </div>
            </>
          )}

          {/* Announcement Cooldown */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-pink-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Announcement Cooldown</span>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {announcementCooldown === 0 ? 'None' : `${announcementCooldown}h`}
            </span>
          </div>
        </div>

        {/* Warning Messages */}
        {(isWorkspaceLimitClose || isSpaceLimitClose || isListLimitClose) && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              You're approaching your limits. Consider upgrading for more resources.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
