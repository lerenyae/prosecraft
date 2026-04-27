'use client';

import { Bold, Italic, Undo2, Maximize2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';

type EditorToolbarProps = {
  projectTitle: string;
  chapterTitle: string;
  onBold?: () => void;
  onItalic?: () => void;
  onUndo?: () => void;
  onFocus?: () => void;
  onAskAI?: () => void;
};

export function EditorToolbar({
  projectTitle,
  chapterTitle,
  onBold,
  onItalic,
  onUndo,
  onFocus,
  onAskAI,
}: EditorToolbarProps) {
  return (
    <div className="sticky top-0 z-10 bg-cream border-b border-edge py-3.5 px-10 flex items-center justify-between gap-4">
      <div className="text-[13px] truncate">
        <span className="text-muted">{projectTitle} / </span>
        <span className="text-bark font-semibold">{chapterTitle}</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <ToolbarButton onClick={onBold} title="Bold"><Bold size={14} /></ToolbarButton>
        <ToolbarButton onClick={onItalic} title="Italic"><Italic size={14} /></ToolbarButton>
        <ToolbarButton onClick={onUndo} title="Undo"><Undo2 size={14} /></ToolbarButton>
        <ToolbarButton onClick={onFocus} title="Focus mode"><Maximize2 size={14} /></ToolbarButton>
        <button
          onClick={onAskAI}
          className="bg-sage text-cream rounded-md px-3 h-[30px] text-[13px] font-medium hover:bg-sage-deep transition-colors flex items-center gap-1.5"
        >
          <Sparkles size={13} />
          Ask AI
        </button>
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  title,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'w-[30px] h-[30px] flex items-center justify-center bg-cream text-bark border border-edge rounded-md hover:bg-cream-2 transition-colors',
        className
      )}
    >
      {children}
    </button>
  );
}
