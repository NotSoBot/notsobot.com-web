import { Check, Copy } from 'lucide-react';

import { useCopied } from '@/hooks/useCopied';
import { useI18n } from '@/i18n';


// Copies `value` and shows a check for a moment. Icon only by default; with `label` it's a small ghost button
// sized for section headers (tag content, flagged urls).
export function CopyButton({ value, label }: {value: string, label?: string}) {
  const { t } = useI18n();
  const { copied, copy } = useCopied();
  const onClick = () => void copy(value);
  if (label) {
    return (
      <button type='button' className='btn btn-ghost btn-sm' onClick={onClick}>
        {(copied) ? <Check className='size-4 text-success-text'/> : <Copy className='size-4'/>}
        {(copied) ? t('common.copied') : label}
      </button>
    );
  }
  return (
    <button
      type='button'
      aria-label={t('common.copy')}
      title={t('common.copy')}
      className='shrink-0 cursor-pointer rounded p-0.5 text-subtle hover:bg-surface-3 hover:text-fg'
      onClick={onClick}
    >
      {(copied) ? <Check className='size-3.5 text-success-text'/> : <Copy className='size-3.5'/>}
    </button>
  );
}
