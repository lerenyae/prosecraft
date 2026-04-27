/**
 * Centralized fetch wrapper for AI routes.
 *
 * Detects 402 upgrade_required responses and throws a typed error so
 * client components can render an UpgradePrompt instead of a generic toast.
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
}

/**
 * Fetch wrapper that:
 * - Throws UpgradeRequiredError on 402 with error === 'upgrade_required'
 * - Throws QuotaExceededError on 429 with error === 'quota_exceeded'
 * - Throws Error with server-provided message otherwise on !ok
 * - Returns parsed JSON on success
 */
export async function aiFetch<T = unknown>(
  url: string,
  options: AiFetchOptions = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => null) as
      | { error?: string; reason?: string; upgradeUrl?: string; resetAt?: string }
      | null;

    if (response.status === 402 && errBody?.error === 'upgrade_required') {
      throw new UpgradeRequiredError(
        errBody.reason || 'This feature requires the Author plan.',
        errBody.upgradeUrl || '/pricing'
      );
    }

    if (response.status === 429 && errBody?.error === 'quota_exceeded') {
      throw new QuotaExceededError(
        errBody.reason || 'Daily AI assist limit reached.',
        errBody.upgradeUrl || '/pricing',
        errBody.resetAt
      );
    }

    throw new Error(errBody?.error || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function isUpgradeError(err: unknown): err is UpgradeRequiredError {
  return err instanceof UpgradeRequiredError;
}

export function isQuotaError(err: unknown): err is QuotaExceededError {
  return err instanceof QuotaExceededError;
}
