import type { KeyboardEvent } from 'react';

import { cn } from '@/lib/utils';


// A radio group drawn as one bar. Like native radios it's a single tab stop (the checked option), and the arrow keys
// move to the next option and pick it
export function Segmented({ label, value, options, onChange, disabled = false }: {
  label: string,
  value: string,
  options: Array<{value: string, label: string}>,
  onChange: (value: string) => void,
  disabled?: boolean,
}) {
  // with nothing checked the first option takes the tab stop, so the group can still be reached
  const tabStop = (options.some((option) => option.value === value)) ? value : options[0]?.value;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = (event.key === 'ArrowRight' || event.key === 'ArrowDown') ? 1 : (event.key === 'ArrowLeft' || event.key === 'ArrowUp') ? -1 : 0;
    if (!step || disabled) {
      return;
    }
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    if (index === -1) {
      return;
    }
    // the page would scroll otherwise, and a browsing modal around it (useArrowKeyNavigation) would step to its next item
    event.preventDefault();
    event.stopPropagation();
    const next = (index + step + options.length) % options.length;
    buttons[next].focus();
    onChange(options[next].value);
  };

  return (
    <div role='radiogroup' aria-label={label} onKeyDown={onKeyDown} className='flex rounded-lg border border-line bg-deep p-1'>
      {options.map((option) => (
        <button
          key={option.value}
          type='button'
          role='radio'
          aria-checked={option.value === value}
          tabIndex={(option.value === tabStop) ? 0 : -1}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            'cursor-pointer rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors disabled:cursor-default disabled:opacity-60',
            (option.value === value) ? 'bg-surface-3 text-white shadow-sm' : 'text-muted hover:text-white',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
