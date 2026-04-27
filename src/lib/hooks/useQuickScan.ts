'use client';

import { useCallback, useState } from 'react';

export type QuickScanScore = {
  score: number;
  label: string;
};

export type QuickScanResult = {
  verdict: string;
  scores: {
    pacing: QuickScanScore;
    prose: QuickScanScore;
    dialogue: QuickScanScore;
    tension: QuickScanScore;
    clarity: QuickScanScore;
  };
  flags: string[];
  strengths: string[];
};

type Args = {
  text: string;
  chapterTitle?: string;
  genre?: string;
};

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; result: QuickScanResult };

/**
 * Quick Scan hook — POSTs the current chapter's plain text to /api/ai/quickscan.
 *
 * Per spec section 7, this is the first AI hook to wire. The route is already
 * deployed and uses Sonnet (cheap-ish) — spec calls for Haiku eventually for
 * even faster cost; that's a route-level swap, not a hook change.
 */
export function useQuickScan() {
  const [state, setState] = useState<State>({ status: 'idle' });

  const run = useCallback(async ({ text, chapterTitle, genre }: Args) => {
    if (!text || text.length < 50) {
      setState({
        status: 'error',
        message: 'Need at least 50 words of writing in this chapter to scan.',
      });
      return;
    }
    setState({ status: 'loading' });
    try {
      const res = await fetch('/api/ai/quickscan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, chapterTitle, genre }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: 'Request failed' }));
        setState({
          status: 'error',
          message: errBody.error ?? `Request failed (${res.status})`,
        });
        return;
      }
      const result = (await res.json()) as QuickScanResult;
      setState({ status: 'done', result });
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Network error',
      });
    }
  }, []);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, run, reset };
}
