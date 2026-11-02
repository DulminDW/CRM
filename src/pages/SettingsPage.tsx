import React from 'react';
import { Settings } from 'lucide-react';
import { PageShell } from '../components/ui/PageShell';

export const SettingsPage: React.FC = () => {
  return (
    <PageShell
      title="CRM Settings & System Administration"
      badge="Administrative Controls"
      description="System configurations, user role management (Admin / Staff), rate-management permission assignments, and audit log inspection."
      icon={Settings}
      handoverSectionRef="Handover Section 7.6, 17 & 18.1"
      plannedFeatures={[
        'User Management: List CRM staff profiles (5-15 internal users) and assign roles.',
        'Permission Delegation: Admin can toggle "Can Manage Rates" for designated staff members.',
        'Chat Group Administration: Admin-only creation and member management of chat groups.',
        'Security Audit Log: Review system events, rate adjustments, and quote timestamps.',
        'System Environment Status: Verify Supabase connection, storage bucket health, and email service.'
      ]}
      securityControls={[
        'Admin-Only Access: Settings and permission modification strictly gated by Admin role.',
        'Zero Client Self-Escalation: Users cannot grant themselves Admin or Rate-Management permissions.',
        'Supabase RLS with custom claim / role checking on public.user_roles table.',
        'Mandatory Multi-Factor Authentication (MFA) planned for privileged Admin accounts.'
      ]}
    />
  );
};
