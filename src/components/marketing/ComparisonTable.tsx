import { Check, X } from 'lucide-react';

/**
 * Pricing-page comparison table.
 *
 * Positions SeedQuill against the obvious alternatives writers consider.
 * Catches high-intent SEO traffic ("seedquill vs sudowrite", "best AI for novelists")
 * and seals the value prop for visitors who are comparison-shopping.
 *
 * Tone: factual, not bitter. Don't trash competitors. Show our edge.
 */

interface Row {
  feature: string;
  seedquill: 'yes' | 'no' | string;
  sudowrite: 'yes' | 'no' | string;
  prowriting: 'yes' | 'no' | string;
  chatgpt: 'yes' | 'no' | string;
}

const ROWS: Row[] = [
  {
    feature: 'Built specifically for novelists',
    seedquill: 'yes',
    sudowrite: 'yes',
    prowriting: 'no',
    chatgpt: 'no',
  },
  {
    feature: 'Voice fingerprint per project',
    seedquill: 'yes',
    sudowrite: 'partial',
    prowriting: 'no',
    chatgpt: 'no',
  },
  {
    feature: 'Whole-Book chat with citations',
    seedquill: 'yes',
    sudowrite: 'no',
    prowriting: 'no',
    chatgpt: 'no',
  },
  {
    feature: 'Tracked AI changes (accept / reject)',
    seedquill: 'yes',
    sudowrite: 'partial',
    prowriting: 'yes',
    chatgpt: 'no',
  },
  {
    feature: 'Writing rules (POV, tense, banned phrases)',
    seedquill: 'yes',
    sudowrite: 'no',
    prowriting: 'no',
    chatgpt: 'no',
  },
  {
    feature: 'Built on Claude (prose-quality leader)',
    seedquill: 'yes',
    sudowrite: 'no',
    prowriting: 'no',
    chatgpt: 'no',
  },
  {
    feature: 'Industry-standard DOCX export',
    seedquill: 'yes',
    sudowrite: 'partial',
    prowriting: 'yes',
    chatgpt: 'no',
  },
  {
    feature: 'Local-first storage, JSON backup',
    seedquill: 'yes',
    sudowrite: 'no',
    prowriting: 'no',
    chatgpt: 'no',
  },
  {
    feature: 'Cancel anytime, work portable',
    seedquill: 'yes',
    sudowrite: 'yes',
    prowriting: 'yes',
    chatgpt: 'yes',
  },
  {
    feature: 'Made by a working novelist',
    seedquill: 'yes',
    sudowrite: 'no',
    prowriting: 'no',
    chatgpt: 'no',
  },
];

const PRICES = {
  seedquill: '$10–14/mo',
  sudowrite: '$19–59/mo',
  prowriting: '$30/mo',
  chatgpt: '$20/mo',
};

function Cell({ value }: { value: 'yes' | 'no' | string }) {
  if (value === 'yes') {
    return (
      <div className="flex justify-center">
        <Check className="w-4 h-4 text-sage" />
      </div>
    );
  }
  if (value === 'no') {
    return (
      <div className="flex justify-center">
        <X className="w-4 h-4 text-muted/50" />
      </div>
    );
  }
  return (
    <div className="text-center text-[12px] text-muted italic">{value}</div>
  );
}

export function ComparisonTable() {
  return (
    <section className="bg-cream px-6 sm:px-14 py-20">
      <div className="max-w-[1000px] mx-auto">
        <div className="text-center mb-10">
          <p className="text-sm font-medium text-sage-deep tracking-wide uppercase mb-3">
            Why SeedQuill
          </p>
          <h2 className="font-display text-bark text-[36px] sm:text-[42px] leading-[1.1] tracking-[-1px] mb-3">
            How it stacks up.
          </h2>
          <p className="text-[15px] text-muted max-w-[520px] mx-auto leading-[1.6]">
            The honest comparison. We did the homework so you don&apos;t have to.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-edge">
                <th className="text-left py-4 pr-4 font-semibold text-bark min-w-[260px]">
                  Feature
                </th>
                <th className="py-4 px-3 text-center">
                  <div className="font-display text-bark text-[16px]">SeedQuill</div>
                  <div className="text-[12px] text-sage-deep font-medium mt-1">
                    {PRICES.seedquill}
                  </div>
                </th>
                <th className="py-4 px-3 text-center">
                  <div className="font-medium text-bark/80 text-[14px]">Sudowrite</div>
                  <div className="text-[12px] text-muted mt-1">{PRICES.sudowrite}</div>
                </th>
                <th className="py-4 px-3 text-center">
                  <div className="font-medium text-bark/80 text-[14px]">ProWritingAid</div>
                  <div className="text-[12px] text-muted mt-1">{PRICES.prowriting}</div>
                </th>
                <th className="py-4 px-3 text-center">
                  <div className="font-medium text-bark/80 text-[14px]">ChatGPT Plus</div>
                  <div className="text-[12px] text-muted mt-1">{PRICES.chatgpt}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr
                  key={row.feature}
                  className={`border-b border-edge/60 ${
                    i % 2 === 0 ? 'bg-cream-2/40' : ''
                  }`}
                >
                  <td className="py-3.5 pr-4 text-bark/85">{row.feature}</td>
                  <td className="py-3.5 px-3 bg-sage/5">
                    <Cell value={row.seedquill} />
                  </td>
                  <td className="py-3.5 px-3">
                    <Cell value={row.sudowrite} />
                  </td>
                  <td className="py-3.5 px-3">
                    <Cell value={row.prowriting} />
                  </td>
                  <td className="py-3.5 px-3">
                    <Cell value={row.chatgpt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-[12px] text-muted/80 text-center max-w-[640px] mx-auto leading-[1.6]">
          Pricing accurate as of April 2026. Competitor features summarized from public docs;
          your mileage may vary. We respect every tool on this list — we just think novelists
          deserve one built for them.
        </p>
      </div>
    </section>
  );
}
