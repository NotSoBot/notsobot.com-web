import type { SiteTranslations } from '../../translate';

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


export const Portuguese: SiteTranslations = Object.freeze({
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
