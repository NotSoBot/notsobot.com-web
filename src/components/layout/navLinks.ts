import { Routes } from '@/config';
import { useEditorAccess } from '@/editor/hosts/access';
import type { TranslationKey } from '@/i18n';


// `also` are other paths the link shows as active on
export const NAV_LINKS: ReadonlyArray<{to: string, label: TranslationKey, also?: ReadonlyArray<string>}> = [
  {to: Routes.COMMANDS, label: 'nav.commands'},
  {to: Routes.TAG_DIRECTORY, label: 'nav.tags'},
  {to: Routes.TAG_DOCS, label: 'nav.docs', also: [Routes.TAG_DOCS_MEDIASCRIPT]},
  {to: Routes.PREMIUM, label: 'nav.premium'},
  {to: Routes.STATUS, label: 'nav.status'},
  {to: Routes.CHANGELOG, label: 'nav.changelog'},
  {to: Routes.FAQ, label: 'nav.faq'},
];


export type NavLinkItem = (typeof NAV_LINKS)[number];

// the site's links, plus the media editor's after Commands for whoever it's open to
export function useNavLinks(): ReadonlyArray<NavLinkItem> {
  const { allowed } = useEditorAccess();
  if (!allowed) {
    return NAV_LINKS;
  }
  return [NAV_LINKS[0], {to: Routes.EDITOR, label: 'nav.editor'}, ...NAV_LINKS.slice(1)];
}
