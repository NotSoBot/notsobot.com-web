import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useI18n } from '@/i18n';
import { cn, NO_AUTOFILL } from '@/lib/utils';


// edits locally and lands in the URL once typing stops (and only when it's a snowflake)
export function IdFilter({ className, label, placeholder, value, onChange }: {
  className?: string,
  label: string,
  placeholder: string,
  value: string,
  onChange: (value: string | null) => void,
}) {
  const { t } = useI18n();
  const [ input, setInput ] = useState(value);
  useEffect(() => setInput(value), [value]);
  const debounced = useDebouncedValue(input.trim(), 400);
  useEffect(() => {
    if (debounced !== value && (!debounced || /^\d+$/.test(debounced))) {
      onChange(debounced);
    }
    // only when the typed value settles
  }, [debounced]);

  return (
    <label className={cn('text-sm', className)}>
      <span className='mb-1 block text-subtle'>{label}</span>
      <span className='relative block'>
        <input
          className='input pr-9 font-mono'
          inputMode='numeric'
          autoComplete='off'
          {...NO_AUTOFILL}
          placeholder={placeholder}
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        {(input) ? (
          <button
            type='button'
            aria-label={t('ui.clear_filter', {label: label.toLowerCase()})}
            className='absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer rounded p-1 text-subtle hover:text-fg'
            onClick={() => {
              setInput('');
              onChange(null);
            }}
          >
            <X className='size-4'/>
          </button>
        ) : null}
      </span>
    </label>
  );
}
