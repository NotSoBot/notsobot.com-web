import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';


// Why a dialog's action failed, in a box above its buttons. Announced to screen readers when it appears
export function DialogError({ className, children }: {className?: string, children: ReactNode}) {
  return (
    <p role='alert' className={cn('rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg', className)}>
      {children}
    </p>
  );
}
