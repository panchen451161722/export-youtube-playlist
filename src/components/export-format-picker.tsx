import {
  YOUTUBE_EXPORT_FORMATS,
  type YouTubeExportFormat,
} from '@/lib/youtube-export';
import { Checkbox } from '@/components/ui/checkbox';

type Props = {
  selected: YouTubeExportFormat[];
  onChange: (formats: YouTubeExportFormat[]) => void;
  disabled?: boolean;
};

export function ExportFormatPicker({
  selected,
  onChange,
  disabled = false,
}: Props) {
  const selectedSet = new Set(selected);

  return (
    <div
      className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
      data-testid="export-format-picker"
    >
      {YOUTUBE_EXPORT_FORMATS.map((format) => (
        <label
          key={format.key}
          className="border-border bg-card hover:bg-secondary has-[[data-checked]]:border-foreground has-[[data-checked]]:bg-secondary flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 transition-colors has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:opacity-60"
        >
          <Checkbox
            checked={selectedSet.has(format.key)}
            disabled={disabled}
            onCheckedChange={(checked) => {
              onChange(
                checked
                  ? [...selected, format.key]
                  : selected.filter((item) => item !== format.key)
              );
            }}
            className="data-checked:border-primary data-checked:bg-primary size-5"
          />
          <span className="text-foreground text-sm font-medium">
            {format.label}
          </span>
        </label>
      ))}
    </div>
  );
}
