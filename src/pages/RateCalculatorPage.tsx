import React from 'react';
import { Calculator } from 'lucide-react';
import { PageShell } from '../components/ui/PageShell';

export const RateCalculatorPage: React.FC = () => {
  return (
    <PageShell
      title="Rate Calculator & Hotel Rate Settings"
      badge="Hotel-Specific Calculation Engine"
      description="Calculate derived room rates automatically per hotel from configured base rates (e.g. HB Double) and supplements/reductions."
      icon={Calculator}
      handoverSectionRef="Handover Section 7.4 & Whiteboard Reference"
      plannedFeatures={[
        'Hotel-specific calculation rules: Each hotel configures its own specific adjustment logic.',
        'Support base rates (e.g. HB Double base) and derived outputs.',
        'Calculations for Single Reduction, Triple Supplement, BB Reduction, and meal plans.',
        'Instant rate preview before saving or attaching to quote distribution.',
        'Wait for official company Excel spreadsheets before hard-coding calculation formulas.'
      ]}
      securityControls={[
        'Server-side calculation validation to prevent client-side price tampering.',
        'Configured formulas protected by Admin/authorized staff permissions.',
        'Audit trail of formula revisions to prevent silent pricing manipulation.'
      ]}
    />
  );
};
