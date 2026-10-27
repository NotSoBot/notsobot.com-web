import { Routes } from '@/config';
import type { TranslationKey } from '@/i18n';


// `also` are other paths the link shows as active on
export const NAV_LINKS: ReadonlyArray<{to: string, label: TranslationKey, also?: ReadonlyArray<string>}> = [
  {to: Routes.COMMANDS, label: 'nav.commands'},
  {to: Routes.TAG_DIRECTORY, label: 'nav.tags'},
  {to: Routes.TAG_DOCS, label: 'nav.docs', also: [Routes.TAG_DOCS_MEDIASCRIPT]},
  {to: Routes.STATUS, label: 'nav.status'},
  {to: Routes.CHANGELOG, label: 'nav.changelog'},
  {to: Routes.FAQ, label: 'nav.faq'},
];
