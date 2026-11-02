import React from 'react';
import { CalendarDays } from 'lucide-react';
import { PageShell } from '../components/ui/PageShell';

export const HotelSeasonsPage: React.FC = () => {
  return (
    <PageShell
      title="Hotel Seasons"
      badge="Seasonal Periods"
      description="Manage seasonal validity periods (e.g. 2026 Summer, 2026/27 Winter, 2027 Summer) configured per partner hotel."
      icon={CalendarDays}
      handoverSectionRef="Handover Section 6 & Whiteboard Matrix"
      plannedFeatures={[
        'Filter seasons by selecting Hotel from dropdown.',
        'View Date In and Date Out validity ranges per season.',
        'Track active, upcoming, and expired seasonal periods.',
        'Preserve rate sheets attached to specific seasons across years.'
      ]}
      securityControls={[
        'Admin-controlled or authorized staff permission required to edit seasonal dates.',
        'Immutability protection: Active quotes retain original season snapshot.',
        'Validation on overlapping date ranges to prevent ambiguous seasonal pricing.'
      ]}
    />
  );
};
