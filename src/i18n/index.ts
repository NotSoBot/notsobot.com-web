export { I18nProvider, initI18n, useI18n, type I18nContextValue, type RichComponents } from './I18nProvider';
export {
  DEFAULT_LANGUAGE,
  intlLocale,
  LANGUAGE_NAMES,
  LANGUAGE_PREFIXES,
  languageFromLocale,
  languagePath,
  Languages,
  splitLanguagePath,
  type Language,
} from './languages';
export { activeLanguage, hasTranslation, loadDashboardText, maybeTranslate, translate, translatePlural, type PluralKey, type TranslationKey, type Translations } from './translate';
