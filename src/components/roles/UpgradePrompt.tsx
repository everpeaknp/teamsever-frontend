'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface UpgradePromptProps {
  show: boolean;
  feature: 'customRoles' | 'customTables';
  currentPlan: string;
  requiredPlan: string;
  onClose: () => void;
  onUpgrade: () => void;
}

const featureNames = {
  customRoles: 'Custom Display Roles',
  customTables: 'Customizable Tables',
};

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  show,
  feature,
  currentPlan,
  requiredPlan,
  onClose,
  onUpgrade,
}) => {
  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center text-center space-y-4 py-6">
          <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4">
            <Lock className="h-12 w-12 text-gray-600 dark:text-gray-400" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">
              Unlock {featureNames[feature]}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              This feature is available on the <span className="font-semibold">{requiredPlan}</span> plan.
              <br />
              You are currently on the <span className="font-semibold">{currentPlan}</span> plan.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
            <Button
              onClick={onUpgrade}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Upgrade to {requiredPlan}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
