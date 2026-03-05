import { ButtonHTMLAttributes, forwardRef } from 'react';

type TButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type TButtonSize = 'sm' | 'md' | 'lg';

interface IButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TButtonVariant;
  size?: TButtonSize;
  loading?: boolean;
}

const variantClasses: Record<TButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover focus-visible:ring-accent',
  secondary: 'bg-surface-raised text-zinc-200 border border-border hover:bg-zinc-700 focus-visible:ring-zinc-500',
  ghost: 'text-zinc-400 hover:text-zinc-200 hover:bg-surface-raised focus-visible:ring-zinc-500',
  danger: 'bg-red-900/40 text-error border border-red-800 hover:bg-red-900/60 focus-visible:ring-error',
};

const sizeClasses: Record<TButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-10 px-4 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, IButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, disabled, className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
);

Button.displayName = 'Button';
