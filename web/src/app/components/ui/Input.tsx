import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      <label className="block text-sm font-['Inter'] text-[var(--auralynne-muted)] mb-2">
        {label}
      </label>
      <input
        className={`w-full h-14 rounded-[10px] bg-[var(--auralynne-surface-strong)] border ${
          error ? 'border-[#E53935]' : 'border-[var(--auralynne-border)]'
        } px-4 font-['Inter'] text-[var(--auralynne-text)] placeholder:text-[#967c87] focus:outline-none focus:border-[var(--auralynne-primary)] focus:border-2 focus:shadow-[0_0_0_5px_rgba(239,111,145,0.1)] transition-all ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-[#E53935] font-['Inter']">{error}</p>
      )}
    </div>
  );
}
