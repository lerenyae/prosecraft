/**
 * Centralized fetch wrapper for AI routes.
 *
 * Detects 402 upgrade_required and 429 quota_exceeded responses and throws
 * typed errors so client components can render an UpgradePrompt or quota
 * banner instead of a generic toast.
 *
 * Internal calls (auto-runs like Style Profile on chapter open, Filter
 * Words initial scan) should pass `{ internal: true }` so they:
 *   1) Do NOT count against the daily 10/day quota for free users
 *   2) Do not dispatch the quota-changed UI refresh event
 *
 * The server route is responsible for honoring the `?internal=1` query
 * param and skipping the increment on its end. The client side just adds
 * the param.
 */

export class UpgradeRequiredError extends Error {
  reason: string;
  upgradeUrl: string;
  constructor(reason: string, upgradeUrl: string = '/pricing') {
    super(reason);
    this.name = 'UpgradeRequiredError';
    this.reason = reason;
    this.upgradeUrl = upgradeUrl;
  }
}

export class QuotaExceededError extends Error {
  reason: string;
  upgradeUrl: string;
  resetAt?: string;
  constructor(reason: string, upgradeUrl: string = '/pricing', resetAt?: string) {
    super(reason);
    this.name = 'QuotaExceededError';
    this.reason = reason;
    this.upgradeUrl = upgradeUrl;
    this.resetAt = resetAt;
  }
}

export interface AiFetchOptions extends RequestInit {
  body?: BodyInit | null;
  /**
   * When true, this call is a system-initiated auto-run (e.g., Style Profile
   * on chapter open) and should not count against the user's daily quota.
   * Adds `?internal=1` to the URL — server must honor it.
   */
  internal?: boolean;
}

const QUOTA_EVENT = 'seedquill:quota-changed';

function withInternalFlag(url: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}internal=1`;
}

/**
 * Fetch wrapper that:
 * - Throws UpgradeRequiredError on 402 with error === 'upgrade_required'
 * - Throws QuotaExceededError on 429 with error === 'quota_exceeded'
 * - Throws Error with server-provided message otherwise on !ok
 * - Returns parsed JSON on success
 * - Dispatches `seedquill:quota-changed` after a successful billable call
 *   so QuotaBadge updates without polling.
 */
export async function aiFetch<T = unknown>(
  url: string,
  options: AiFetchOptions = {}
): Promise<T> {
  const { internal, ...rest } = options;
  const finalUrl = internal ? withInternalFlag(url) : url;

  const response = await fetch(finalUrl, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(rest.headers || {}),
    },
  });

  if (!response.ok) {
    const errBody = (await response.json().catch(() => null)) as
      | { error?: string; reason?: string; upgradeUrl?: string; resetAt?: string }
      | null;

    if (response.status === 402 && errBody?.error === 'upgrade_required') {
      throw new UpgradeRequiredError(
        errBody.reason || 'This feature requires the Author plan.',
        errBody.upgradeUrl || '/pricing'
      );
    }

    if (response.status === 429 && errBody?.error === 'quota_exceeded') {
      // Quota hit — refresh the badge so it shows 10/10 immediately.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(QUOTA_EVENT));
      }
      throw new QuotaExceededError(
        errBody.reason || 'Daily AI assist limit reached.',
        errBody.upgradeUrl || '/pricing',
        errBody.resetAt
      );
    }

    throw new Error(errBody?.error || `Request failed: ${response.status}`);
  }

  // Successful billable call — refresh the badge.
  if (!internal && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(QUOTA_EVENT));
  }

  return response.json() as Promise<T>;
}

export function isUpgradeError(err: unknown): err is UpgradeRequiredError {
  return err instanceof UpgradeRequiredError;
}

export function isQuotaError(err: unknown): err is QuotaExceededError {
  return err instanceof QuotaExceededError;
}
