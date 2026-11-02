import React from 'react';
import { PhoneCall } from 'lucide-react';
import { PageShell } from '../components/ui/PageShell';

export const SalesActivitiesPage: React.FC = () => {
  return (
    <PageShell
      title="Sales Activities & Voice Notes"
      badge="Sales Interactions"
      description="Record sales interactions, phone discussions, and voice notes linked to Travel Agencies, Members, and Hotels. Note: Activity is not a booking receipt."
      icon={PhoneCall}
      handoverSectionRef="Handover Section 13 & 12.2"
      plannedFeatures={[
        'Log sales activity: Select Travel Agency, Member, Hotel, Date, and Description.',
        'In-browser voice recording: Record audio notes directly from desktop/mobile microphone.',
        'Audio preview & playback before saving activity.',
        'Optional voice transcription with user-selected language before transcription begins.',
        'Preserve original audio file if speech-to-text transcription fails.'
      ]}
      securityControls={[
        'Audio recordings stored in private Supabase Storage bucket with signed URL access.',
        'Server-side validation of audio MIME type and maximum file size (e.g. 10MB).',
        'Staff visibility rules: Sales staff can inspect team activities without exposing external keys.',
        'Transcription API keys kept strictly server-side in Edge Functions.'
      ]}
    />
  );
};
