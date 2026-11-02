import React from 'react';
import { BarChart3 } from 'lucide-react';
import { PageShell } from '../components/ui/PageShell';

export const AnalyticsPage: React.FC = () => {
  return (
    <PageShell
      title="Analytics & Reports"
      badge="Business Intelligence"
      description="Intelligence dashboards, distribution volume, hotel popularity, and PDF export reports derived strictly from real CRM records."
      icon={BarChart3}
      handoverSectionRef="Handover Section 14 & PDF 4.6"
      plannedFeatures={[
        'Hotel-wise analysis: Rates shared per hotel, top agencies, and pricing tier trends.',
        'Agency-wise analysis: Most engaged travel agencies, contacts quoted, and quote history.',
        'Market-wise distribution: Geographic market activity across regional desks.',
        'Staff-wise activity: Quotes generated, sales calls logged, and email success metrics.',
        'Official PDF Report Export (Confirmed in requirements).'
      ]}
      securityControls={[
        'All metrics generated strictly from authenticated, verified database records (no fabricated stats).',
        'Staff-level permission controls on executive-level revenue/margin analytics if introduced.',
        'Server-side aggregation to protect raw audit logs from mass unauthorized retrieval.'
      ]}
    />
  );
};
