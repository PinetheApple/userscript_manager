type TBadgeVariant = 'success' | 'warning' | 'error' | 'neutral';

interface IBadgeProps {
  variant?: TBadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<TBadgeVariant, string> = {
  success: 'bg-emerald-900/40 text-success border-emerald-800',
  warning: 'bg-amber-900/40 text-warning border-amber-800',
  error: 'bg-red-900/40 text-error border-red-800',
  neutral: 'bg-zinc-800 text-zinc-400 border-zinc-700',
};

export function Badge({ variant = 'neutral', children, className = '' }: IBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
