import React from 'react';
import { Globe2 } from 'lucide-react';
import { PageShell } from '../components/ui/PageShell';

export const MarketsPage: React.FC = () => {
  return (
    <PageShell
      title="Markets"
      badge="Agencies Hierarchy (Level 2)"
      description="Manage regional desks and destination markets (e.g., Indian Market, Europe Market, Belgium Market) partitioned per Travel Agency."
      icon={Globe2}
      handoverSectionRef="Handover Section 5.2 & Whiteboard Hierarchy"
      plannedFeatures={[
        'Filter markets by selecting parent Travel Agency from dropdown.',
        'View members belonging to each market desk.',
        'Allow non-globally-unique market names (e.g., Indian Market under multiple agencies).',
        'Direct link to bulk distribute rates to all members within a selected market.'
      ]}
      securityControls={[
        'Strict foreign-key integrity linking markets to verified travel agency records.',
        'Prevent cross-agency data tampering via server-side agency boundary checks.',
        'Input sanitization on market naming to prevent script injection in dropdowns.'
      ]}
    />
  );
};
