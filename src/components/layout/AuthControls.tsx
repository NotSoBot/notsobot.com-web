import { ChevronDown, LayoutDashboard, LogIn, LogOut, MessageSquareWarning, RefreshCw, Settings } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';

import { useAuth } from '@/auth';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Routes } from '@/config';
import { useReportsUnreadQuery } from '@/lib/api/queries';
import { userDisplayTag } from '@/lib/discord';
import { cn } from '@/lib/utils';


export function AuthControls({ compact = false }: {compact?: boolean}) {
  const { status, user, login, retry } = useAuth();

  if (status === 'loading') {
    return <div aria-label='Loading account' className='h-11 w-11 animate-pulse rounded-full bg-surface-3 sm:w-40'/>;
  }

  if (status === 'authenticated' && user) {
    return <UserMenu compact={compact}/>;
  }

  if (status === 'error') {
    return (
      <button type='button' className='btn btn-ghost' onClick={retry} title="Couldn't reach NotSoBot — retry">
        <RefreshCw className='size-4'/>
        {compact ? null : <span>Retry</span>}
      </button>
    );
  }

  return (
    <button type='button' className='btn btn-outline-brand font-medium' onClick={() => login()}>
      <LogIn className='size-4'/>
      <span>{compact ? 'Login' : 'Login with Discord'}</span>
    </button>
  );
}


function UserMenu({ compact }: {compact: boolean}) {
  const { user, token, logout } = useAuth();
  // reports with something from staff they haven't opened: a dot on the avatar and a Reports item in the menu
  const unreadReports = useReportsUnreadQuery(token).data?.count ?? 0;
  const [ open, setOpen ] = useState(false);
  const [ loggingOut, setLoggingOut ] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const location = useLocation();

  // close after following a menu link
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) {
    return null;
  }

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className='relative'>
      <button
        type='button'
        aria-haspopup='menu'
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className='flex cursor-pointer items-center gap-2.5 rounded-full border border-line bg-surface-2 py-1 pr-3 pl-1 transition-colors hover:border-line-strong'
      >
        <span className='relative shrink-0'>
          <UserAvatar user={user} size={80} className='size-9 rounded-full bg-surface-3'/>
          {(unreadReports) ? (
            <span className='absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-surface-2 bg-brand'>
              <span className='sr-only'>{unreadReports.toLocaleString()} report {(unreadReports === 1) ? 'update' : 'updates'}</span>
            </span>
          ) : null}
        </span>
        {/* `compact` (the navbar) only leaves the name out on phones, there's room for it from sm up */}
        <span className={cn('max-w-40 truncate text-sm font-medium text-white', compact && 'hidden sm:inline')}>{user.username}</span>
        <ChevronDown className={cn('size-4 text-subtle transition-transform', open && 'rotate-180')}/>
      </button>

      {(open) ? (
        <div
          id={menuId}
          role='menu'
          className='absolute right-0 z-50 mt-2 w-60 origin-top-right animate-fade-in overflow-hidden rounded-lg border border-line bg-surface shadow-2xl shadow-black/40'
        >
          <div className='flex items-center gap-3 border-b border-line px-4 py-3'>
            <UserAvatar user={user} size={128} className='size-10 rounded-full bg-surface-3'/>
            <div className='min-w-0'>
              <div className='truncate text-sm font-semibold'>{userDisplayTag(user)}</div>
              <div className='truncate font-mono text-xs text-subtle'>{user.id}</div>
            </div>
          </div>
          {/* the dashboard links, with Log out on its own below a divider so it's not hit by mistake */}
          <div className='p-1.5'>
            <Link
              to={Routes.DASHBOARD}
              role='menuitem'
              className='flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg hover:bg-surface-2'
            >
              <LayoutDashboard className='size-4 text-muted'/>
              Dashboard
            </Link>
            {(unreadReports) ? (
              <Link
                to={Routes.DASHBOARD_REPORTS}
                role='menuitem'
                className='flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg hover:bg-surface-2'
              >
                <MessageSquareWarning className='size-4 text-muted'/>
                Report updates
                <span className='ml-auto min-w-5 rounded-full bg-brand px-1.5 text-center text-xs leading-5 font-semibold text-white tabular-nums'>
                  {unreadReports.toLocaleString()}
                </span>
              </Link>
            ) : null}
            <Link
              to={Routes.DASHBOARD_SETTINGS}
              role='menuitem'
              className='flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg hover:bg-surface-2'
            >
              <Settings className='size-4 text-muted'/>
              Settings
            </Link>
          </div>
          <div className='border-t border-line p-1.5'>
            <button
              type='button'
              role='menuitem'
              disabled={loggingOut}
              onClick={onLogout}
              className='flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-surface-2 disabled:opacity-60'
            >
              <LogOut className='size-4'/>
              {loggingOut ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
