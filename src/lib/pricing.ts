/**
 * SeedQuill pricing constants.
 *
 * Single source of truth — every pricing-page component, billing toggle,
 * and copy block reads from here.
 *
 * If we ever introduce a third tier, add it here first; never sprinkle
 * numbers across components.
 */
export const PRICING = {
  seedling: {
    name: 'Seedling',
    monthly: 0,
    yearly: 0,
    aiAssistsPerDay: 10,
    maxManuscripts: 1,
    maxWordsPerManuscript: 30000,
  },
  author: {
    name: 'Author',
    monthly: 14,
    yearly: 120,
    monthlyEquivalent: 10, // 120 / 12
    annualSavings: 48, // (14 * 12) - 120
    aiAssistsPerDay: Infinity,
    maxManuscripts: Infinity,
  },
} as const;

export type Billing = 'monthly' | 'yearly';
