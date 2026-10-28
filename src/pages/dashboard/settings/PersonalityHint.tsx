import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Routes } from '@/config';
import { useI18n } from '@/i18n';


export const PERSONALITY_TAGSCRIPT_EXAMPLE = 'You are a pirate talking to {user}. {if:{len:{args}}|<|40|then:They asked something short, so answer in one sentence.|else:Give a detailed, step-by-step answer.}';


// The bot runs the personality through TagScript (when it has braces) before every AI reply,
// with `{args}` set to what was asked.
export function PersonalityHint({ children }: {children: ReactNode}) {
  const { rich } = useI18n();
  return (
    <span className='block space-y-1'>
      <span className='block'>
        {children}{' '}
        {rich('settings.personality_hint', {
          docs: (chunk) => <Link to={Routes.TAG_DOCS} className='text-brand-text hover:underline'>{chunk}</Link>,
          code: (chunk) => <code className='font-mono text-fg'>{chunk}</code>,
        })}
      </span>
      <span className='block'>
        {rich('settings.personality_example', {
          code: (chunk) => <code className="font-mono text-code break-words [font-feature-settings:'calt'_0,'liga'_0]">{chunk}</code>,
        }, {example: PERSONALITY_TAGSCRIPT_EXAMPLE})}
      </span>
    </span>
  );
}
