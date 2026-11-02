import React from 'react';
import { Hotel } from 'lucide-react';
import { PageShell } from '../components/ui/PageShell';

export const HotelsPage: React.FC = () => {
  return (
    <PageShell
      title="Hotels Management"
      badge="Property Inventory"
      description="Manage partner hotel profiles including Randoli, Beragala, Horton Heights, and H.S.H. Supports service types (Online / Offline / Both)."
      icon={Hotel}
      handoverSectionRef="Handover Section 6 & PDF 4.1"
      plannedFeatures={[
        'List partner hotels with Area, Service Type, and operational status.',
        'View hotel-specific seasons, calculation configurations, and rate history.',
        'Filter hotels by Area and Service Type (Online/Offline/Both).',
        'Preserve property metadata without inventing unverified star ratings or addresses.'
      ]}
      securityControls={[
        'Staff-wide view access; editing restricted to Admins and authorized staff.',
        'Audit logging on property modifications, room types, or status changes.',
        'Default-deny Postgres RLS protecting hotel inventory from unauthorized writes.'
      ]}
    />
  );
};
