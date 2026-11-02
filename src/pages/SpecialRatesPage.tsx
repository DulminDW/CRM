import React from 'react';
import { Sparkles } from 'lucide-react';
import { PageShell } from '../components/ui/PageShell';

export const SpecialRatesPage: React.FC = () => {
  return (
    <PageShell
      title="Special Rates (Slots 1, 2, 3)"
      badge="Agency-Specific VIP Rates"
      description="Agency-specific negotiated rate slots (Special Rate 1, 2, 3) created during sales negotiations. Does NOT require Admin pre-approval."
      icon={Sparkles}
      handoverSectionRef="Handover Section 7.5 & Section 8.5"
      plannedFeatures={[
        'Support exactly 3 dedicated slots: Special Rate 1, Special Rate 2, Special Rate 3.',
        'Agency-specific binding: Linked strictly to one Travel Agency + Hotel + Season.',
        'Record Amount, Currency, Date In, Date Out, Note/Reason, and Creator identity.',
        'Visible in Share Rates wizard only when quoting the corresponding agency.'
      ]}
      securityControls={[
        'Confidentiality boundary: Strictly prohibited from leaking to non-negotiated agencies.',
        'Server-side validation during quote generation to verify recipient belongs to the authorized agency.',
        'Prevent cross-agency exposure via default-deny Supabase RLS and server function validation.',
        'Immutable snapshot saved with every quote to preserve historical agreement integrity.'
      ]}
    />
  );
};
