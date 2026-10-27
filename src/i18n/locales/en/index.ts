// The English strings are the source: their keys, with dashboardIndex.ts's, are every key the site has (`TranslationKey`). Each area is its own
// file, with the same file in every other language's folder. The dashboard's areas are in dashboardIndex.ts, which is
// only fetched once someone opens the dashboard.
import { Common } from './common';
import { Home } from './home';
import { Layout } from './layout';
import { Premium } from './premium';
import { Faq } from './faq';
import { Commands } from './commands';
import { Errors } from './errors';
import { Tags } from './tags';
import { TagMedia } from './tagMedia';
import { Status } from './status';
import { Ui } from './ui';
import { Changelog } from './changelog';
import { TagDocs } from './tagDocs';


export const English = Object.freeze({
  ...Common,
  ...Home,
  ...Layout,
  ...Premium,
  ...Faq,
  ...Commands,
  ...Errors,
  ...Tags,
  ...TagMedia,
  ...Status,
  ...Ui,
  ...Changelog,
  ...TagDocs,
});
