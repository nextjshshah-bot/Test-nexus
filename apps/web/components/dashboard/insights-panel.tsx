'use client';

import { Card, SectionHeader } from '../ui/primitives';

export interface Insight {
  tone: 'positive' | 'warning' | 'neutral';
  title: string;
  detail: string;
}

const TONE_STYLES: Record<Insight['tone'], { border: string; badge: string; label: string }> = {
  positive: { border: 'border-emerald-500/20 bg-emerald-500/[0.05]', badge: 'text-emerald-300', label: '▲' },
  warning: { border: 'border-amber-500/20 bg-amber-500/[0.05]', badge: 'text-amber-300', label: '!' },
  neutral: { border: 'border-white/[0.07] bg-white/[0.02]', badge: 'text-nexus-300', label: '◆' },
};

export function InsightsPanel({ insights }: { insights: Insight[] }): JSX.Element {
  return (
    <Card className="h-full">
      <SectionHeader title="Signals" subtitle="Automated highlights from your metrics" />

      {insights.length === 0 ? (
        <p className="text-xs text-slate-500">Not enough data to surface insights yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {insights.map((insight, index) => {
            const tone = TONE_STYLES[insight.tone];
            return (
              <li key={`${insight.title}-${index}`} className={`rounded-xl border p-3 ${tone.border}`}>
                <div className="flex items-start gap-2.5">
                  <span className={`mt-0.5 text-[11px] font-bold ${tone.badge}`}>{tone.label}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200">{insight.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{insight.detail}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export default InsightsPanel;
