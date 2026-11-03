import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="mt-6 flex flex-col items-center border-2 border-dashed border-line px-6 py-10 text-center">
      <p className="text-xl leading-tight headline">{title}</p>
      {description && <p className="mt-1.5 text-sm font-semibold text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
