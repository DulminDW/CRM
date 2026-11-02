import React from 'react';
import { Building2 } from 'lucide-react';
import { PageShell } from '../components/ui/PageShell';

export const TravelAgenciesPage: React.FC = () => {
  return (
    <PageShell
      title="Travel Agencies"
      badge="Agencies Hierarchy (Level 1)"
      description="Manage partner travel agencies and DMC profiles. Serves as parent entity for all regional markets and agency contacts."
      icon={Building2}
      handoverSectionRef="Handover Section 5.1 & PDF 4.2"
      plannedFeatures={[
        'Search and filter partner travel agencies by country, city, and status.',
        'View agency details, associated regional markets, and total contact members.',
        'Import agency records from company Excel files with preview and duplicate check.',
        'Support PDF DMC Management requirements without overwriting agency models.',
        'Maintain audit history of when an agency is created or updated.'
      ]}
      securityControls={[
        'Postgres Row Level Security (RLS) ensures authenticated internal staff only.',
        'No direct agency-member login; agency contacts are strictly internal CRM records.',
        'Server-side validation on agency creation to prevent name collision/injection.',
        'Admin-only permission for deleting or archiving travel agency records.'
      ]}
    />
  );
};
