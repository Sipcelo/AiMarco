import React from 'react';

export function BrandFooter() {
  return (
    <p className="mt-7 border-t border-[var(--auralynne-border)] pt-4 text-center font-['Inter'] text-xs text-[var(--auralynne-muted)]">
      Desenvolvido por{' '}
      <span className="font-bold">
        <span className="text-[#c9a96e]">AI</span>
        <span className="text-[#556b2f]">Marco</span>
      </span>{' '}
      em parceria com <span className="font-bold text-[var(--auralynne-primary)]">Auralynne</span>
    </p>
  );
}
