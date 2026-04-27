type StatusBarProps = {
  savedAgo?: string;
  projectTitle: string;
  wordCount: number;
  onTrack?: boolean;
};

export function StatusBar({
  savedAgo = '2 minutes ago',
  projectTitle,
  wordCount,
  onTrack = true,
}: StatusBarProps) {
  return (
    <div className="bg-cream-2 border-t border-edge py-2 px-10 flex items-center justify-between text-[12px] text-muted">
      <span className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-sage" />
        <strong className="text-bark font-semibold">Saved</strong> · {savedAgo}
      </span>
      <span>
        {projectTitle} · {wordCount.toLocaleString()} words ·{' '}
        <strong className={onTrack ? 'text-sage-deep font-semibold' : 'text-bark font-semibold'}>
          {onTrack ? 'on track' : 'behind'}
        </strong>
      </span>
    </div>
  );
}
