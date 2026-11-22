import { Check, Copy, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useCopied } from '@/hooks/useCopied';
import { useI18n } from '@/i18n';


const FAILED_DURATION_MS = 1500;

// Copies `value` and shows a check for a moment, or a cross when the browser wouldn't let it (no clipboard access).
// Icon only by default; with `label` it's a small ghost button sized for section headers (tag content, flagged urls).
export function CopyButton({ value, label }: {value: string, label?: string}) {
  const { t } = useI18n();
  const { copied, copy } = useCopied();
  const [ failed, setFailed ] = useState(false);
  const failedTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(failedTimer.current), []);

  const onClick = async () => {
    window.clearTimeout(failedTimer.current);
    const worked = await copy(value);
    setFailed(!worked);
    if (!worked) {
      failedTimer.current = window.setTimeout(() => setFailed(false), FAILED_DURATION_MS);
    }
  };

  if (label) {
    return (
      <button type='button' className='btn btn-ghost btn-sm' onClick={onClick}>
        {(failed) ? <X className='size-4 text-danger-text'/> : (copied) ? <Check className='size-4 text-success-text'/> : <Copy className='size-4'/>}
        {(failed) ? t('ui.copy_failed') : (copied) ? t('common.copied') : label}
      </button>
    );
  }
  const title = t((failed) ? 'ui.copy_failed' : 'common.copy');
  // the icon is small, so the `after` box widens what can be clicked or tapped without moving anything around it
  return (
    <button
      type='button'
      aria-label={title}
      title={title}
      className='relative shrink-0 cursor-pointer rounded p-0.5 text-subtle after:absolute after:-inset-1.5 hover:bg-surface-3 hover:text-fg'
      onClick={onClick}
    >
      {(failed) ? <X className='size-3.5 text-danger-text'/> : (copied) ? <Check className='size-3.5 text-success-text'/> : <Copy className='size-3.5'/>}
    </button>
  );
}
