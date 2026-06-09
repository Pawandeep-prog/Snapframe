import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs text-[var(--text-tertiary)] font-medium">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`bg-[var(--fill-raised)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-violet-500/60 focus:bg-[var(--fill-hover)] transition-colors ${className}`}
        {...props}
      />
    </div>
  );
}
