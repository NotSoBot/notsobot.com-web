import { createContext, lazy, Suspense, useContext, useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { Outlet, useLocation, useNavigate, useNavigationType, type Location } from 'react-router';

import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Routes } from '@/config';


// the modal brings the user's queries and everything staff can do to them, so it's only fetched once a user is opened
const AdminUserModal = lazy(async () => ({default: (await import('./AdminUserModal')).AdminUserModal}));

// a link to a user in the admin user list (`adminUserPath`), under whichever language prefix the site is on
const USER_LINK = new RegExp(`${Routes.DASHBOARD_ADMIN_USERS}/(\\d+)/?$`);

// inside an `AdminUserPeek` already: the outer one opens the user
const InsidePeek = createContext(false);

// The history entry the page was loaded on. A user open on it isn't shown again after a reload (or a restored tab): a
// page's own modal under it loads at the same time, and whichever of the two got its data last would end up on top.
// The first time it's back on the entry before, like a close
const LOAD_KEY: string | null = (typeof window !== 'undefined') ? ((window.history.state as {key?: string} | null)?.key ?? null) : null;
let leftLoadEntry = false;

const LOADING_TITLE_ID = 'admin-user-peek-loading';

// the user open over the page is in the history entry's state, next to whatever the page keeps there
function peekUserId(location: Location): string | null {
  return (location.state as {peekUserId?: string} | null)?.peekUserId ?? null;
}

function onUsersPage(pathname: string): boolean {
  return pathname === Routes.DASHBOARD_ADMIN_USERS || pathname.startsWith(`${Routes.DASHBOARD_ADMIN_USERS}/`);
}


// Around the staff pages (and staff tools shown elsewhere, like a tag's assets on its public page): a plain click on a
// link to a user (`/dashboard/admin/users/<id>`) opens them in a modal over the page it's on instead of going to the
// user list, so a content flag or report being looked at stays where it was. The link itself is untouched, a new tab
// or a copied link still gets the url. The user list is left alone, it opens them over itself already.
// Opening adds a history entry for the same url (the modal can be over a page's own modal, which is in the url), so Back
// closes it like the pages' own modals, and going anywhere else from inside it leaves it behind.
// `children` instead of the route's `<Outlet/>`, for a part of a page outside the staff routes.
export function AdminUserPeek({ children }: {children?: ReactNode}) {
  const content = children ?? <Outlet/>;
  return (useContext(InsidePeek)) ? content : <UserPeek>{content}</UserPeek>;
}

function UserPeek({ children }: {children: ReactNode}) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const { pathname, search } = location;
  const reloaded = location.key === LOAD_KEY && peekUserId(location) !== null;
  const entryUserId = (reloaded || onUsersPage(pathname)) ? null : peekUserId(location);
  useEffect(() => {
    if (reloaded && !leftLoadEntry) {
      leftLoadEntry = true;
      navigate(-1);
    }
  }, [reloaded]);

  // A page replacing its own history entry drops the entry's state, and the open user with it: its search params
  // changing (stepping back from a page of a list that deleting their tags or blocking them just emptied). The user
  // stays up through it, and goes back into the entry below. Closing is a Back and leaving is a new entry, never this
  const last = useRef({pathname, userId: entryUserId});
  const dropped = entryUserId === null && last.current.userId !== null && navigationType === 'REPLACE' && last.current.pathname === pathname;
  const userId = (dropped) ? last.current.userId : entryUserId;
  last.current = {pathname, userId};
  useEffect(() => {
    if (dropped && userId) {
      navigate({pathname, search}, {
        replace: true,
        preventScrollReset: true,
        state: {...(location.state as Record<string, unknown> | null), peekUserId: userId},
      });
    }
  }, [dropped, userId, location]);

  // a close already went back from this entry: a second Escape or click before it's gone would go back twice. Coming
  // back to the entry (Forward) is a new visit
  const closing = useRef(false);
  useEffect(() => {
    closing.current = false;
  }, [location.key]);

  const onClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || onUsersPage(pathname)) {
      return;
    }
    const anchor = (event.target instanceof Element) ? event.target.closest('a') : null;
    if (!anchor || !anchor.href || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) {
      return;
    }
    const url = new URL(anchor.href);
    if (url.origin !== window.location.origin) {
      return;
    }
    const match = USER_LINK.exec(url.pathname);
    if (!match) {
      // A link in the open user's modal to the page it's already over (their tags, over the tag list filtered to
      // them): the router would swap this entry for one that looks the same. Closing is what gets there
      if (userId && url.pathname === window.location.pathname && url.search === window.location.search && !url.hash) {
        event.preventDefault();
        close();
      }
      return;
    }
    // react-router's `Link` leaves a click that's already handled alone
    event.preventDefault();
    // the user who's open already (a warning they gave, a strike they made)
    if (match[1] === userId) {
      return;
    }
    // without the page's hash: the router scrolls to a hash's element on every navigation that has one, which would
    // move the page under the modal. Closing goes back to the entry that has it
    navigate({pathname, search}, {
      // from one user to another inside the modal replaces, so Back still closes it in one go
      replace: !!userId,
      preventScrollReset: true,
      state: {...(location.state as Record<string, unknown> | null), peekUserId: match[1]},
    });
  };

  const close = () => {
    if (!closing.current) {
      closing.current = true;
      navigate(-1);
    }
  };

  return (
    // `contents`: the page lays itself out as if this weren't here. The modal is inside it, so its own links to other
    // users (who warned them, who took their tags down) open in it too
    <InsidePeek.Provider value={true}>
      <div className='contents' onClickCapture={onClickCapture}>
        {children}
        {(userId) ? (
          // a modal from the first moment, not only once its code has arrived: a page's own modal under it stops taking
          // arrow keys and Escape as soon as another one is open over it
          <Suspense fallback={(
            <Modal labelledBy={LOADING_TITLE_ID} onClose={close} className='max-w-lg'>
              <div aria-busy='true' className='flex justify-center px-6 py-16'>
                <h2 id={LOADING_TITLE_ID} className='sr-only'>Loading user</h2>
                <Spinner className='size-8'/>
              </div>
            </Modal>
          )}>
            <AdminUserModal key={userId} userId={userId} onClose={close}/>
          </Suspense>
        ) : null}
      </div>
    </InsidePeek.Provider>
  );
}


// `location.key` for effects that run once per navigation to the page: a user opening over it and closing again aren't
// navigations to it, so it stays what it was through both
export function usePageNavigationKey(): string {
  const location = useLocation();
  const peeking = peekUserId(location) !== null;
  const last = useRef({key: location.key, peeking});
  if (!peeking && !last.current.peeking) {
    last.current.key = location.key;
  }
  last.current.peeking = peeking;
  return last.current.key;
}
