import type { CampaignProgress } from '@/types/campaigns';

type Props = {
  progress?: CampaignProgress;
};

export default function CampaignProgressBar({ progress }: Props) {
  if (!progress) {
    return (
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div className="h-2 w-1/3 rounded-full bg-gray-300" />
      </div>
    );
  }

  const sentPercent = progress.total > 0 ? (progress.sent / progress.total) * 100 : 0;
  const failedPercent = progress.total > 0 ? (progress.failed / progress.total) * 100 : 0;
  const skippedPercent = progress.total > 0 ? (progress.skipped / progress.total) * 100 : 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div className="h-full bg-emerald-500" style={{ width: `${sentPercent}%` }} />
        {failedPercent > 0 && (
          <div className="h-full -mt-2 bg-rose-500" style={{ width: `${failedPercent}%` }} />
        )}
        {skippedPercent > 0 && (
          <div className="h-full -mt-2 bg-amber-400" style={{ width: `${skippedPercent}%` }} />
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {progress.sent}/{progress.total} enviados
        </span>
        <span>{progress.completion}%</span>
      </div>
    </div>
  );
}
