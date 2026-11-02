import React from 'react';
import { Users2 } from 'lucide-react';
import { PageShell } from '../components/ui/PageShell';

export const MembersPage: React.FC = () => {
  return (
    <PageShell
      title="Members / Contact Profiles"
      badge="Agencies Hierarchy (Level 3)"
      description="Manage internal contact profiles for ~1,000 agency staff members (e.g., Sarith, Jana, Priya). Agency contacts do NOT login to CRM."
      icon={Users2}
      handoverSectionRef="Handover Section 5.3, 5.4 & Section 10"
      plannedFeatures={[
        'Full contact profiles: Name, Email, Phone, Position/Title, Agency, Market, Member Code.',
        'Instant search by contact name or email address across ~1,000 records.',
        'View complete historical quotes sent to this contact with immutable price snapshots.',
        'Quick action to launch "Share Rates" directly for the selected contact.',
        'Excel bulk import with duplicate email detection and validation preview.'
      ]}
      securityControls={[
        'Agency contacts have NO CRM login accounts (cannot access backend or API).',
        'Duplicate email prevention enforced via unique database constraint.',
        'Strict email syntax validation to prevent header injection in quote emails.',
        'Audited view logs to prevent mass scraping of confidential agency contact lists.'
      ]}
    />
  );
};
