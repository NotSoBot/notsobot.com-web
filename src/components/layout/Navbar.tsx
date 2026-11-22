import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, matchPath, NavLink, useLocation } from 'react-router';

import logo from '@/assets/logos/NotSoLogo.svg';
import { BotInviteLink } from '@/components/BotInviteLink';
import { config, Routes } from '@/config';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import { AuthControls } from './AuthControls';
import { NAV_LINKS } from './navLinks';


// the logo run through every media iv effect that keeps its transparency (see assets/logos/effects/README.md)
const LOGO_EFFECTS = Object.values(import.meta.glob<string>('@/assets/logos/effects/*.webp', {
  eager: true,
  import: 'default',
  query: '?no-inline',
}));

// effects go out in a shuffled order so every one is shown before any repeats, then it reshuffles
let logoEffectQueue: string[] = [];

function peekLogoEffect(previous?: string): string {
  if (!logoEffectQueue.length) {
    logoEffectQueue = [...LOGO_EFFECTS];
    for (let i = logoEffectQueue.length - 1; 0 < i; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ logoEffectQueue[i], logoEffectQueue[j] ] = [ logoEffectQueue[j], logoEffectQueue[i] ];
    }
    // don't show the same effect twice in a row across a reshuffle
    if (1 < logoEffectQueue.length && logoEffectQueue[0] === previous) {
      logoEffectQueue.push(logoEffectQueue.shift()!);
    }
  }
  return logoEffectQueue[0];
}

function takeLogoEffect(previous?: string): string {
  const effect = peekLogoEffect(previous);
  logoEffectQueue.shift();
  return effect;
}


export function Navbar() {
  const { t } = useI18n();
  const [ mobileOpen, setMobileOpen ] = useState(false);
  const location = useLocation();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // close the mobile menu whenever we navigate
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // and on Escape, handing focus back to its button when it was on one of the menu's links (they're gone)
  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (menuRef.current?.contains(document.activeElement)) {
          menuButtonRef.current?.focus();
        }
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  const isAlsoActive = (paths?: ReadonlyArray<string>) => !!paths?.some((path) => !!matchPath({path, end: false}, location.pathname));

  return (
    <header className='sticky top-0 z-40 border-b border-line bg-surface'>
      <nav className='container-page flex h-16 items-center gap-4' aria-label={t('nav.main')}>
        <button
          ref={menuButtonRef}
          type='button'
          className='btn btn-ghost -ml-2 px-2 md:hidden'
          aria-label={t(mobileOpen ? 'nav.close_menu' : 'nav.open_menu')}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
        >
          {mobileOpen ? <X className='size-5'/> : <Menu className='size-5'/>}
        </button>

        <HomeLink/>

        <div className='ml-auto flex items-center gap-5'>
          <ul className='hidden items-center gap-5 md:flex'>
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) => cn('text-sm transition-colors', (isActive || isAlsoActive(link.also)) ? 'text-white' : 'text-muted hover:text-white')}
                >
                  {t(link.label)}
                </NavLink>
              </li>
            ))}
          </ul>
          {config.authEnabled ? <AuthControls compact/> : null}
        </div>
      </nav>

      {(mobileOpen) ? (
        <div ref={menuRef} className='animate-fade-in border-t border-line md:hidden'>
          <ul className='container-page flex flex-col gap-1 py-3'>
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) => cn(
                    'block rounded-md px-3 py-2.5 text-base transition-colors',
                    (isActive || isAlsoActive(link.also)) ? 'bg-surface-3 text-white' : 'text-muted hover:bg-surface-2 hover:text-white',
                  )}
                >
                  {t(link.label)}
                </NavLink>
              </li>
            ))}
            <li className='pt-2'>
              <BotInviteLink source='navbar' className='btn btn-discord w-full'>{t('common.add_to_discord')}</BotInviteLink>
            </li>
          </ul>
        </div>
      ) : null}
    </header>
  );
}


// the logo swaps to the next effect while anywhere on the link (logo or title) is hovered
function HomeLink() {
  // the effect being shown, null while not hovered
  const [ effect, setEffect ] = useState<string | null>(null);
  const lastEffect = useRef<string | undefined>(undefined);

  // whether a mouse (or pen) has moved on the page yet. touch devices never hover the logo, and most visits never reach
  // it, so nothing is fetched for them
  const [ pointerSeen, setPointerSeen ] = useState(false);
  useEffect(() => {
    if (pointerSeen) {
      return;
    }
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') {
        setPointerSeen(true);
      }
    };
    window.addEventListener('pointermove', onPointerMove, {passive: true});
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [pointerSeen]);

  // load the upcoming effect ahead of time so the hover swap doesn't flash empty
  useEffect(() => {
    if (pointerSeen) {
      new Image().src = peekLogoEffect(lastEffect.current);
    }
  }, [effect, pointerSeen]);

  return (
    <Link
      to={Routes.HOME}
      className='flex items-center gap-2 transition-opacity hover:opacity-80'
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch') {
          lastEffect.current = takeLogoEffect(lastEffect.current);
          setEffect(lastEffect.current);
        }
      }}
      onPointerLeave={() => setEffect(null)}
    >
      <img src={effect ?? logo} alt='' className='size-8 object-contain'/>
      <span className='text-2xl font-semibold text-white'>NotSoBot</span>
    </Link>
  );
}
