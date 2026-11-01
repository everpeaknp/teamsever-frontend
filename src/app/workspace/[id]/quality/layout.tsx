'use client';

import { useParams } from 'next/navigation';
import { QualityProjectHeader } from '@/components/quality/QualityProjectHeader';
import { QualityProjectProvider } from '@/components/quality/QualityProjectContext';
import { PlanFeatureGate } from '@/components/subscription/PlanFeatureGate';

export default function QualityLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const workspaceId = (params?.id as string) || '';

  return (
    <PlanFeatureGate
      workspaceId={workspaceId}
      featureKey="canUseQaModule"
      featureName="Quality Assurance & Testing Suite"
      description="Design test suites, execute manual & automated test runs, track QA defects, and generate compliance reports."
    >
      <QualityProjectProvider>
        <QualityProjectHeader />
        {children}
      </QualityProjectProvider>
    </PlanFeatureGate>
  );
}
