import { createContext, useContext } from 'react';


// what the dashboard pages inside the Activity (Server settings, src/activity-games/server, and Your settings,
// src/activity-games/user) get from it. In its own module so a page can read it without importing a screen
export interface ActivitySettingsHost {
  // notsobot.com, where links to the site's other pages open
  siteUrl: string,
  // a link opened outside Discord's iframe (the sdk's `openExternalLink`)
  openExternal: (url: string) => void,
  // back to the mode choice
  onBack: () => void,
}

export const ActivitySettingsHostContext = createContext<ActivitySettingsHost | null>(null);


export function useActivitySettingsHost(): ActivitySettingsHost {
  const value = useContext(ActivitySettingsHostContext);
  if (!value) {
    throw new Error('useActivitySettingsHost must be used inside <SettingsScreen>');
  }
  return value;
}
