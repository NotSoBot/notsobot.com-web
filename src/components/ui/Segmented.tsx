import { cn } from '@/lib/utils';


export function Segmented({ label, value, options, onChange, disabled = false }: {
  label: string,
  value: string,
  options: Array<{value: string, label: string}>,
  onChange: (value: string) => void,
  disabled?: boolean,
}) {
  return (
    <div role='radiogroup' aria-label={label} className='flex rounded-lg border border-line bg-deep p-1'>
      {options.map((option) => (
        <button
          key={option.value}
          type='button'
          role='radio'
          aria-checked={option.value === value}
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
