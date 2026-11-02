import React from 'react';
import { Percent } from 'lucide-react';
import { PageShell } from '../components/ui/PageShell';

export const RateManagementPage: React.FC = () => {
  return (
    <PageShell
      title="Rate Management"
      badge="Confidential Rates"
      description="Manage core hotel pricing tiers (Red = Lowest, Green = Normal, Yellow = Highest). Visibility is internal; rate labels are hidden from external quotes."
      icon={Percent}
      handoverSectionRef="Handover Section 7.1, 7.2, 7.3 & 7.6"
      plannedFeatures={[
        'Interactive rate selector: Hotel dropdown → Season/Year dropdown → Rate Cards.',
        'Accessible color cards with explicit labels: Red (Lowest), Green (Normal), Yellow (Highest).',
        'Display verified room types, meal plans, currency, and pricing amounts.',
        'Version control tracking monthly updates without overwriting historical quotes.',
        'Admin grantable permission: Admins can assign Rate-Management rights to selected staff.'
      ]}
      securityControls={[
        'Postgres RLS: Unauthorized staff strictly blocked from modifying base rates.',
        'Zero client-side trust: Rate edit permissions verified server-side on every request.',
        'Data sanitization: Internal color tags (Red/Green/Yellow) and margins are stripped from outgoing quote emails.',
        'Audit logging on every rate modification: actor ID, timestamp, old value, and new value.'
      ]}
    />
  );
};
