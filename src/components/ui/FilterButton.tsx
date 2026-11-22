import { Filter } from 'lucide-react';


// small funnel icon that narrows the list to whatever it sits next to
export function FilterButton({ label, onClick }: {label: string, onClick: () => void}) {
  return (
    <button
      type='button'
      aria-label={label}
      title={label}
      className='shrink-0 cursor-pointer rounded p-1 text-subtle hover:bg-surface-3 hover:text-fg'
      onClick={onClick}
    >
      <Filter className='size-3.5'/>
    </button>
  );
}
