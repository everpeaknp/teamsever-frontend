import { QualityProjectHeader } from '@/components/quality/QualityProjectHeader';

export default function QualityLayout({ children }: { children: React.ReactNode }) {
  return <>
    <QualityProjectHeader />
    {children}
  </>;
}
