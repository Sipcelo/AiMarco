import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  children, 
  className = '',
  disabled,
  ...props 
}: ButtonProps) {
  const baseStyles = "h-14 rounded-xl px-6 transition-all duration-200 font-['Inter'] font-bold disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantStyles = {
    primary: "bg-[var(--auralynne-primary)] text-white hover:bg-[var(--auralynne-primary-dark)] shadow-[0_10px_25px_rgba(233,75,106,0.28)] active:scale-[0.98]",
    secondary: "bg-transparent border-2 border-[var(--auralynne-border)] text-[var(--auralynne-muted)] hover:border-[var(--auralynne-primary)] hover:text-[var(--auralynne-primary)] hover:bg-[var(--auralynne-soft-pink)]",
    ghost: "bg-transparent text-[var(--auralynne-primary)] underline hover:text-[var(--auralynne-primary-dark)] px-2"
  };
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
