'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { AICard } from './AICard';
import { cn } from '@/lib/cn';
import { useStudioContext } from '@/lib/studio-context';
import { useQuickScan, type QuickScanResult } from '@/lib/hooks/useQuickScan';

type Tab = 'craft' | 'voice' | 'story' | 'chat';

const TABS: { id: Tab; label: string }[] = [
  { id: 'craft', label: 'Craft' },
  { id: 'voice', label: 'Voice' },
  { id: 'story', label: 'Story' },
  { id: 'chat', label: 'Chat' },
];

export function AIPanel() {
  const [active, setActive] = useState<Tab>('craft');

  return (
    <aside className="bg-cream-2 border-l border-edge flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-4 py-4 border-b border-edge">
        <h2 className="font-display text-[15px] font-semibold text-bark">Studio</h2>
        <button aria-label="Close studio panel" className="text-muted hover:text-bark transition-colors p-1 -mr-1 rounded">
          <X size={16} />
        </button>
      </header>

      <div className="px-4 pt-3.5">
        <div className="bg-cream border border-edge rounded-md p-[3px] flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={cn(
                'flex-1 text-center py-1.5 text-[12px] font-medium rounded transition-colors',
                active === t.id ? 'bg-bark text-cream' : 'text-muted hover:text-bark'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {active === 'craft' && <CraftTab />}
        {active === 'voice' && <VoiceTab />}
        {active === 'story' && <StoryTab />}
        {active === 'chat' && <ChatTab />}
      </div>
    </aside>
  );
}

function CraftTab() {
  const { chapterText, chapterTitle } = useStudioContext();
  const { state, run } = useQuickScan();
  const handleScan = () => run({ text: chapterText, chapterTitle: chapterTitle || undefined });

  if (state.status !== 'done') {
    const helperBody =
      state.status === 'error'
        ? state.message
        : state.status === 'loading'
        ? 'Scanning the current chapter…'
        : 'A 10-second health check on the current chapter — pacing, prose, tension. No filler.';
    return (
      <AICard
        tag="Quick Scan"
        timestamp={state.status === 'loading' ? 'now' : undefined}
        title="Run a quick scan"
        body={helperBody}
        actionLabel="Scan this chapter"
        loading={state.status === 'loading'}
        onAction={handleScan}
      />
    );
  }
  return <QuickScanResultCards result={state.result} onRescan={handleScan} />;
}

function QuickScanResultCards({ result, onRescan }: { result: QuickScanResult; onRescan: () => void }) {
  const stats = [
    { label: 'Pacing', value: `${result.scores.pacing.label} (${result.scores.pacing.score}/10)` },
    { label: 'Prose', value: `${result.scores.prose.label} (${result.scores.prose.score}/10)` },
    { label: 'Dialogue', value: `${result.scores.dialogue.label} (${result.scores.dialogue.score}/10)` },
    { label: 'Tension', value: `${result.scores.tension.label} (${result.scores.tension.score}/10)` },
    { label: 'Clarity', value: `${result.scores.clarity.label} (${result.scores.clarity.score}/10)` },
  ];
  return (
    <>
      <AICard tag="Quick Scan" timestamp="just now" title={result.verdict} stats={stats} actionLabel="Scan again" onAction={onRescan} />
      {result.flags.length > 0 && (
        <AICard tag="Flags" title={`${result.flags.length} thing${result.flags.length === 1 ? '' : 's'} to fix`} body={result.flags.map((f) => `• ${f}`).join('\n')} />
      )}
      {result.strengths.length > 0 && (
        <AICard tag="Strengths" title="What's working" body={result.strengths.map((s) => `• ${s}`).join('\n')} />
      )}
    </>
  );
}

function VoiceTab() {
  return (
    <AICard
      tag="Voice Match"
      timestamp="learned"
      title="97% you"
      body="Your style fingerprint after 23k words. The studio uses this on every AI suggestion."
      stats={[
        { label: 'Sentence rhythm', value: 'Long–short–short' },
        { label: 'Lexical signature', value: 'Tactile, austere' },
        { label: 'Imagery density', value: '1 per ~110 words' },
      ]}
    />
  );
}

function StoryTab() {
  return (
    <AICard
      tag="Today's goal"
      timestamp="active"
      title="On track"
      stats={[
        { label: 'Daily target', value: '500 words' },
        { label: 'Written today', value: '342' },
        { label: 'Streak', value: '6 days' },
      ]}
    />
  );
}

function ChatTab() {
  return (
    <div className="text-[13px] text-muted leading-relaxed pt-2">
      <p>Chat with the manuscript. Ask anything about your story — characters, beats, continuity, next chapter. Coming soon.</p>
    </div>
  );
}
