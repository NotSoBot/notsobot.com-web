// Logins only ask Discord for `identify`, the optional scopes are asked for when someone wants what they're for
// (`guilds` for their server list). Each login replaces the grant the api keeps, so once this browser granted one it's
// asked for again on every later login, a plain login would drop it otherwise.

export type DiscordOptionalScope = 'guilds';

const GRANTED_KEY = 'auth:discord-scopes';
// what the login in progress asked for, kept once it comes back with a token
const PENDING_KEY = 'auth:discord-scopes-pending';
const OPTIONAL_SCOPES: ReadonlyArray<DiscordOptionalScope> = ['guilds'];


function parseScopes(value: string | null): Array<DiscordOptionalScope> {
  return (value || '').split(',').filter((scope): scope is DiscordOptionalScope => {
    return (OPTIONAL_SCOPES as ReadonlyArray<string>).includes(scope);
  });
}


export function grantedScopes(): Array<DiscordOptionalScope> {
  try {
    return parseScopes(window.localStorage.getItem(GRANTED_KEY));
  } catch {
    return [];
  }
}


export function markScopesPending(scopes: Array<DiscordOptionalScope>): void {
  try {
    window.sessionStorage.setItem(PENDING_KEY, scopes.join(','));
  } catch {
    // storage unavailable
  }
}


// the login came back with a token, so Discord granted what it asked for (the api refuses a grant missing any)
export function confirmPendingScopes(): void {
  try {
    const pending = window.sessionStorage.getItem(PENDING_KEY);
    window.sessionStorage.removeItem(PENDING_KEY);
    if (pending !== null) {
      window.localStorage.setItem(GRANTED_KEY, parseScopes(pending).join(','));
    }
  } catch {
    // storage unavailable
  }
}


// a grant this browser didn't record turned out to have it (logged in before the scopes were remembered here)
export function rememberGrantedScope(scope: DiscordOptionalScope): void {
  const granted = grantedScopes();
  if (!granted.includes(scope)) {
    try {
      window.localStorage.setItem(GRANTED_KEY, [...granted, scope].join(','));
    } catch {
      // storage unavailable
    }
  }
}


// logging out on purpose, the next person on this browser shouldn't be asked for them
export function forgetGrantedScopes(): void {
  try {
    window.localStorage.removeItem(GRANTED_KEY);
  } catch {
    // storage unavailable
  }
}
