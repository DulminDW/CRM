import React from 'react';
import { MessageSquare } from 'lucide-react';
import { PageShell } from '../components/ui/PageShell';

export const TeamChatPage: React.FC = () => {
  return (
    <PageShell
      title="Internal Team Chat"
      badge="Realtime Communication"
      description="Internal WhatsApp-style messaging between CRM staff members. Features text, image sharing, voice messages, mentions, and notifications."
      icon={MessageSquare}
      handoverSectionRef="Handover Section 12"
      plannedFeatures={[
        'Real-time messaging powered by Supabase Realtime WebSocket subscriptions.',
        'Audio voice notes recording and in-app waveform playback.',
        'Image and attachment sharing inside group conversations.',
        '@name user mentions triggering in-app desktop/mobile notifications.',
        'Admin-only group creation: Only Admins can initiate new chat groups (Confirmed).'
      ]}
      securityControls={[
        'Strict group authorization: Users can only read/listen to messages in groups where they are members.',
        'Attachments saved in private Supabase Storage buckets accessible only via signed short-lived URLs.',
        'File upload validation: Allowed MIME types (audio/webm, audio/mp4, image/jpeg, image/png) and max size.',
        'RLS policies enforcing that non-members cannot query message history via Supabase client.',
        'Prevent cross-tenant message leakage.'
      ]}
    />
  );
};
