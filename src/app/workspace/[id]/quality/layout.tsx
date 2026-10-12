import { QualityProjectHeader } from '@/components/quality/QualityProjectHeader';
import { QualityProjectProvider } from '@/components/quality/QualityProjectContext';

export default function QualityLayout({ children }: { children: React.ReactNode }) {
  return <QualityProjectProvider>
    <QualityProjectHeader />
    {children}
  </QualityProjectProvider>;
}
