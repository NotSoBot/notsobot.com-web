// The guides: their shape (types.ts) and the per-language loader (load.ts). The content itself is in en.ts, es.ts and
// pt.ts, only ever imported by load.ts so each language stays its own chunk.
export { guidesQuery, loadedGuides, loadGuides } from './load';
export {
  GUIDE_SLUGS,
  parseGuideLink,
  UPCOMING_GUIDE_SLUGS,
  type Guide,
  type GuideBlock,
  type GuideBook,
  type GuideSection,
  type GuideSectionIds,
  type GuideSlug,
  type UpcomingGuide,
  type UpcomingGuideSlug,
} from './types';
