import { useCallback, useState } from 'react';


// the settings are split into groups that each sit on their own server page, with their own save bar.
// Saving one never touches another's edits. `general` is two panels, the server settings and auto-embed, over one draft
// and one save bar
export type SettingsGroup = 'general' | 'ai' | 'moderation' | 'warnings';


// which of a modal's forms have unsaved edits, for the tabs' dots and asking before closing. In its own file: the server
// page's shell needs it without the settings form (and all it brings) coming along
export function useDirtyGroups<K extends string>() {
  const [ dirty, setDirty ] = useState<Partial<Record<K, boolean>>>({});
  const setter = useCallback((key: K) => (value: boolean) => {
    setDirty((previous) => (!!previous[key] === value) ? previous : {...previous, [key]: value});
  }, []);
  const any = Object.values(dirty).some(Boolean);
  return {dirty, setter, any};
}
