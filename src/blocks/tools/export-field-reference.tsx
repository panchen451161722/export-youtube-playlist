import { YOUTUBE_EXPORT_COLUMNS } from '@/lib/youtube-export/types';
import { m } from '@/paraglide/messages.js';
import { ExportFieldList } from '@/components/tools/export-field-list';

export function ExportFieldReference() {
  const descriptions = {
    title: m['tools.fields.title'](),
    description: m['tools.fields.description'](),
    thumbnailUrl: m['tools.fields.thumbnailUrl'](),
    channelName: m['tools.fields.channelName'](),
    views: m['tools.fields.views'](),
    likes: m['tools.fields.likes'](),
    comments: m['tools.fields.comments'](),
    durationSeconds: m['tools.fields.durationSeconds'](),
    durationMinutes: m['tools.fields.durationMinutes'](),
    durationTimestamp: m['tools.fields.durationTimestamp'](),
    duration: m['tools.fields.duration'](),
    uploadedTime: m['tools.fields.uploadedTime'](),
    videoUrl: m['tools.fields.videoUrl'](),
    tags: m['tools.fields.tags'](),
    descriptionTags: m['tools.fields.descriptionTags'](),
    emails: m['tools.fields.emails'](),
    links: m['tools.fields.links'](),
  };

  return (
    <ExportFieldList
      heading={m['tools.fields.heading']()}
      description={m['tools.fields.intro']()}
      note={m['tools.fields.note']()}
      fields={YOUTUBE_EXPORT_COLUMNS.map(({ key, label }) => ({
        title: label,
        description: descriptions[key],
      }))}
    />
  );
}
