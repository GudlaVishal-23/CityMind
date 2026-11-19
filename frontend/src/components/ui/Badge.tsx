import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border font-mono tabular-nums transition-colors',
  {
    variants: {
      variant: {
        default: 'text-slate-300 bg-slate-800/80 border-slate-700/60',
        critical: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        warning: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        healthy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        cognitive: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
        subtle: 'text-slate-400 bg-slate-900/60 border-white/[0.08]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant,
  children,
  ...props
}) => {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
};

