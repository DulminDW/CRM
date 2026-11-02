import React from 'react';
import { Bell } from 'lucide-react';
import { PageShell } from '../components/ui/PageShell';

export const NotificationsPage: React.FC = () => {
  return (
    <PageShell
      title="Notifications & Activity History"
      badge="Alert Center"
      description="Notification feeds for rate distribution events, Sales Team group alerts, chat mentions, and email delivery receipts."
      icon={Bell}
      handoverSectionRef="Handover Section 11 & Section 14"
      plannedFeatures={[
        'Fixed Sales Team group broadcast: Automatically alerts sales team when rates are quoted.',
        'Displays sender, agency, member, hotels quoted, rate option, and delivery timestamp.',
        'Email delivery status indicator: Created, Sending, Sent, or Delivery Failed.',
        'Chat mention alerts and unread message counters.',
        'Mark notifications as read and filter by event category.'
      ]}
      securityControls={[
        'Notification delivery failure must NEVER delete the quote snapshot.',
        'Failed emails must never falsely show as "Sent".',
        'Users can only query notifications addressed to them or their assigned groups.',
        'Postgres RLS policy restricting notification reads to authenticated recipient ID.'
      ]}
    />
  );
};
