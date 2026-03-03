import React from 'react';
import { RiskScores } from '@/data/mockData';

function getRiskStyle(score: number) {
  if (score < 30) return { label: 'Stable', bg: 'hsl(152, 50%, 94%)', color: 'hsl(152, 60%, 42%)', border: 'hsl(152, 60%, 42%, 0.2)' };
  if (score < 60) return { label: 'Moderate', bg: 'hsl(38, 80%, 94%)', color: 'hsl(38, 92%, 50%)', border: 'hsl(38, 92%, 50%, 0.2)' };
  return { label: 'Critical', bg: 'hsl(0, 60%, 95%)', color: 'hsl(0, 72%, 51%)', border: 'hsl(0, 72%, 51%, 0.2)' };
}

function RiskMeter({ label, score }: { label: string; score: number }) {
  const style = getRiskStyle(score);
  return (
    <div className="p-4 rounded-xl" style={{ backgroundColor: style.bg, borderWidth: 1, borderStyle: 'solid', borderColor: style.border }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm font-bold" style={{ color: style.color }}>{style.label}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${score}%`, backgroundColor: style.color }} />
      </div>
      <div className="text-right mt-1">
        <span className="text-xs font-mono" style={{ color: style.color }}>{score}%</span>
      </div>
    </div>
  );
}

export default function RiskPanel({ scores }: { scores: RiskScores }) {
  return (
    <div className="space-y-3">
      <RiskMeter label="Treatment Failure" score={scores.treatmentFailure} />
      <RiskMeter label="Disease Progression" score={scores.diseaseProgression} />
      <RiskMeter label="Drug Side Effects" score={scores.drugSideEffect} />
      <RiskMeter label="Readmission Risk" score={scores.readmission} />
    </div>
  );
}
