import React from 'react';
import { Send } from 'lucide-react';
import { PageShell } from '../components/ui/PageShell';

export const ShareRatesPage: React.FC = () => {
  return (
    <PageShell
      title="Share Rates / Quote Wizard"
      badge="Quote Distribution Workflow"
      description="7-step wizard to quote partner hotel rates to agency contacts, preview external email body, save immutable snapshots, and notify Sales Team."
      icon={Send}
      handoverSectionRef="Handover Section 8 & Section 9"
      plannedFeatures={[
        'Step 1: Recipient Scope selection (Individual Member / Entire Market / Entire Agency).',
        'Step 2: Recipient selection with real-time recipient count display.',
        'Step 3: Hotel selection (All Partner Hotels / Single Hotel / Multiple Selected Hotels).',
        'Step 4: Season/Year selection per hotel.',
        'Step 5: Rate choice per hotel: Red, Green, Yellow, Special (1-3), or Custom quote entry.',
        'Step 6: Review final quote body: Recipient list, hotel details, clean prices (internal labels hidden).',
        'Step 7: Send via server-side email dispatch, save snapshot, notify fixed internal Sales Team group.'
      ]}
      securityControls={[
        'Zero client trust: Email dispatch and recipient expansion handled strictly server-side.',
        'Strict email body sanitization: Internal rate codes (Red/Green/Yellow) and profit margins never exposed.',
        'Special Rate validation: Server-side check that special rates match recipient agency.',
        'Quota and rate limiting to prevent email spam or compromised account abuse.',
        'Immutable quote snapshot stored in database so subsequent rate changes do not alter history.'
      ]}
    />
  );
};
