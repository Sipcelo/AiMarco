import React from 'react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  return (
    <div className="w-full">
      <div className="flex gap-2 mb-2">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={`flex-1 h-1 rounded-full transition-all duration-300 ${
              index < currentStep ? 'bg-[var(--auralynne-primary)]' : 'bg-[var(--auralynne-border)]'
            }`}
          />
        ))}
      </div>
      <p className="text-sm font-['Inter'] text-[var(--auralynne-muted)] text-center">
        {currentStep}/{totalSteps}
      </p>
    </div>
  );
}
