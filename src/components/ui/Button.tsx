import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary: 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40',
  secondary: 'bg-[var(--fill-active)] hover:bg-[var(--fill-medium)] text-[var(--text-secondary)] border border-[var(--border-light)]',
  ghost: 'hover:bg-[var(--fill-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]',
  danger: 'bg-red-900/60 hover:bg-red-800/70 text-red-200 border border-red-800/40',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-5 py-2.5 text-sm rounded-xl',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-2 font-medium transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
