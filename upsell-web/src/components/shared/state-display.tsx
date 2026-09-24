import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StateDisplayStatus =
  | 'empty'
  | 'loading'
  | 'error'
  | 'success';

type StateDisplayProps = {
  icon: ComponentType<{ className?: string }>;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  status?: StateDisplayStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  iconClassName?: string;
};

const sizeStyles = {
  sm: {
    container: 'px-4 py-5',
    content: 'max-w-xs',
    iconBox: 'mb-2 h-10 w-10 rounded-xl',
    icon: 'h-4 w-4',
    title: 'text-xs',
    description: 'mt-1 text-xs',
    action: 'mt-3',
  },
  md: {
    container: 'px-5 py-6',
    content: 'max-w-sm',
    iconBox: 'mb-3 h-12 w-12 rounded-2xl',
    icon: 'h-5 w-5',
    title: 'text-sm',
    description: 'mt-1 text-xs',
    action: 'mt-4',
  },
  lg: {
    container: 'px-6 py-8',
    content: 'max-w-sm',
    iconBox: 'mb-4 h-14 w-14 rounded-2xl',
    icon: 'h-6 w-6',
    title: 'text-base',
    description: 'mt-2 text-sm',
    action: 'mt-5',
  },
} as const;

const statusStyles = {
  empty: 'text-neutral-400',
  loading: 'text-primary-600',
  error: 'text-red-600',
  success: 'text-emerald-600',
} as const;

export function StateDisplay({
  icon: Icon,
  title,
  description,
  action,
  status = 'empty',
  size = 'md',
  className,
  iconClassName,
}: StateDisplayProps) {
  const styles = sizeStyles[size];
  const role = status === 'error' ? 'alert' : status === 'loading' ? 'status' : undefined;

  return (
    <div
      role={role}
      aria-live={status === 'loading' ? 'polite' : undefined}
      className={cn(
        'flex min-h-0 w-full flex-1 items-center justify-center text-center',
        styles.container,
        className,
      )}
    >
      <div className={styles.content}>
        <div className={cn(
          'mx-auto flex items-center justify-center bg-neutral-100',
          styles.iconBox,
        )}>
          <Icon className={cn(styles.icon, statusStyles[status], iconClassName)} />
        </div>
        <p className={cn('font-semibold text-neutral-700', styles.title)}>{title}</p>
        {description && (
          <p className={cn('leading-relaxed text-neutral-400', styles.description)}>
            {description}
          </p>
        )}
        {action && <div className={styles.action}>{action}</div>}
      </div>
    </div>
  );
}
