'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, ChevronLeft, X, PenTool } from 'lucide-react';

const PROFILE_KEY = 'prosecraft-profile';
const ONBOARDED_KEY = 'prosecraft-onboarded';

export interface WriterProfile {
  experience: 'first-draft' | 'revising' | 'published' | 'pro';
  primaryGenre: string;
  dailyGoal: number;
  challenge: string;
  goals: string[];
  createdAt: string;
}

const EXPERIENCE_OPTIONS: { value: WriterProfile['experience']; label: string; desc: string }[] = [
  { value: 'first-draft', label: 'Working on my first draft', desc: 'Still figuring it out' },
  { value: 'revising', label: 'Revising a manuscript', desc: 'Draft done, polishing it up' },
  { value: 'published', label: 'Self-published or indie', desc: 'Have shipped at least one book' },
  { value: 'pro', label: 'Traditionally published / pro', desc: 'Multiple books, agent, or deal' },
];

const GENRES = [
  'Mystery/Thriller',
  'Romance',
  'Fantasy/Sci-Fi',
  'Literary Fiction',
  'Memoir/Nonfiction',
  'Horror',
  'Historical Fiction',
  'Young Adult',
  'Other',
];

const CHALLENGES = [
  'Getting stuck in the middle',
  'Inconsistent pacing',
  'Flat dialogue',
  'Developing characters',
  'Show vs tell',
  'Finishing a draft',
  'Editing / self-critique',
];

const GOALS = [
  'Finish a draft',
  'Publish traditionally',
  'Self-publish',
  'Improve craft',
  'Build a writing habit',
  'Write for fun',
];

const DAILY_GOAL_PRESETS = [250, 500, 1000, 2000];

export function hasCompletedOnboarding(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(ONBOARDED_KEY) === 'true';
}

export function getWriterProfile(): WriterProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as WriterProfile) : null;
  } catch {
    return null;
  }
}

export default function OnboardingModal({
  onClose,
  forceOpen = false,
}: {
  onClose?: () => void;
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState<WriterProfile['experience']>('first-draft');
  const [primaryGenre, setPrimaryGenre] = useState<string>(GENRES[0]);
  const [dailyGoal, setDailyGoal] = useState<number>(500);
  const [challenge, setChallenge] = useState<string>(CHALLENGES[0]);
  const [goals, setGoals] = useState<string[]>([]);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      return;
    }
    if (typeof window === 'undefined') return;
    if (!hasCompletedOnboarding()) {
      setOpen(true);
    }
  }, [forceOpen]);

  const close = (saved: boolean) => {
    if (saved) {
      const profile: WriterProfile = {
        experience,
        primaryGenre,
        dailyGoal,
        challenge,
        goals,
        createdAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      } catch {
        /* ignore quota */
      }
    }
    try {
      localStorage.setItem(ONBOARDED_KEY, 'true');
    } catch {
      /* ignore */
    }
    setOpen(false);
    onClose?.();
  };

  const toggleGoal = (g: string) => {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  if (!open) return null;

  const steps = [
    {
      title: 'Welcome to ProseCraft',
      subtitle: 'Four quick questions so the AI tailors its feedback to you.',
      body: (
        <div className="space-y-2">
          {EXPERIENCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setExperience(opt.value)}
              className={`w-full text-left p-4 rounded-lg border transition-colors ${
                experience === opt.value
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent-light)]'
              }`}
            >
              <div className="font-medium">{opt.label}</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: 'What are you writing?',
      subtitle: 'Pick the genre you spend the most time in.',
      body: (
        <div className="grid grid-cols-2 gap-2">
          {GENRES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setPrimaryGenre(g)}
              className={`p-3 rounded-lg border text-sm transition-colors ${
                primaryGenre === g
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 font-medium'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent-light)]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: 'Daily word goal',
      subtitle: 'A small target beats a big unmet one. You can change this any time.',
      body: (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {DAILY_GOAL_PRESETS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setDailyGoal(v)}
                className={`p-3 rounded-lg border text-sm transition-colors ${
                  dailyGoal === v
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 font-semibold'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent-light)]'
                }`}
              >
                {v.toLocaleString()}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">
              Or set your own
            </label>
            <input
              type="number"
              min={50}
              max={10000}
              step={50}
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Math.max(50, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>
        </div>
      ),
    },
    {
      title: 'What trips you up most?',
      subtitle: 'The AI will lean in on this.',
      body: (
        <div className="space-y-2">
          {CHALLENGES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChallenge(c)}
              className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                challenge === c
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 font-medium'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent-light)]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: 'What does done look like?',
      subtitle: 'Pick any that apply.',
      body: (
        <div className="grid grid-cols-2 gap-2">
          {GOALS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => toggleGoal(g)}
              className={`p-3 rounded-lg border text-sm transition-colors ${
                goals.includes(g)
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 font-medium'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent-light)]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-[var(--color-surface)] rounded-xl shadow-2xl max-w-lg w-full border border-[var(--color-border)] relative">
        {/* Skip */}
        <button
          type="button"
          onClick={() => close(false)}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)] transition-colors"
          title="Skip"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="p-6 pb-3">
          <div className="flex items-center gap-2 mb-4 text-[var(--color-accent)]">
            <PenTool size={18} />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Step {step + 1} of {steps.length}
            </span>
          </div>
          <h2 className="text-2xl font-semibold mb-1">{current.title}</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">{current.subtitle}</p>
        </div>

        {/* Progress bar */}
        <div className="px-6">
          <div className="h-1 bg-[var(--color-border-light)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-accent)] transition-all duration-300"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="p-6 pt-5 max-h-[50vh] overflow-y-auto">{current.body}</div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-b-xl">
          <button
            type="button"
            onClick={() => (step === 0 ? close(false) : setStep((s) => s - 1))}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            {step === 0 ? (
              'Skip'
            ) : (
              <>
                <ChevronLeft size={16} /> Back
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => (isLast ? close(true) : setStep((s) => s + 1))}
            className="inline-flex items-center gap-1 px-5 py-2 bg-[var(--color-accent)] text-[var(--color-bg-primary)] rounded-lg font-medium hover:bg-[var(--color-accent-dark)] transition-colors text-sm"
          >
            {isLast ? 'Finish' : 'Next'} {!isLast && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
