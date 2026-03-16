import React from 'react';

interface TimeTravelTimelineScrubberProps {
  steps: Array<{
    id: string;
    label: string;
    year: number;
    hasVisual?: boolean;
    statusLabel?: string;
  }>;
  value: number;
  max: number;
  onChange: (value: number) => void;
}

export function TimeTravelTimelineScrubber({
  steps,
  value,
  max,
  onChange,
}: TimeTravelTimelineScrubberProps) {
  if (steps.length <= 1) return null;

  return (
    <div className="absolute inset-x-6 bottom-6 z-40 rounded-3xl border border-white/10 bg-black/70 px-4 py-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-zinc-400">
        <span>Today</span>
        <span>Historical timeline</span>
        <span>{steps[steps.length - 1]?.year}</span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={0.01}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full accent-amber-400"
      />
      <div className="mt-3 flex items-start justify-between gap-2">
        {steps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            onClick={() => onChange(index)}
            className={`min-w-0 flex-1 text-left transition ${
              Math.round(value) === index ? 'text-white' : 'text-zinc-500'
            }`}
          >
            <div className="text-[11px] font-semibold">{step.label}</div>
            <div className="text-[10px] text-zinc-500">
              {step.statusLabel || (step.hasVisual ? 'visual ready' : 'summary ready')}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
