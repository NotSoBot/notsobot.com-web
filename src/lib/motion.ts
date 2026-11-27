// Whether to skip motion started from code (a shake, a slide, a video autoplay): the system's reduce motion, or the
// Activity's Less motion setting (`<html data-motion="reduce">`, src/lib/activityPrefs.ts). CSS animations follow both
// through index.css
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return document.documentElement.dataset.motion === 'reduce' || Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}
