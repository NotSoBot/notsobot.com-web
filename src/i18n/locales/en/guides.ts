// the guides' page chrome (src/pages/guides), the guides themselves are content in src/content/guides. Site strings, so
// the Activity (which loads them too) can label its "How to play" sheet with the same words
export const Guides = {
  'guides.badge': 'Activity guides',
  'guides.title': 'Guides',
  'guides.description': 'How to use NotSoBot’s media editor in its Discord Activity. The quick rules first, the details after.',
  'guides.list_label': 'Guides',
  'guides.quick_rules': 'Quick rules',
  'guides.on_this_page': 'On this page',
  'guides.all': 'All guides',
  'guides.read': 'Read the guide',
  'guides.coming_soon': 'Coming soon',
  'guides.more': 'More guides',
  'guides.tip': 'Tip',
  // notsobot.com's guides index: the game guides' card, they're on notsogames.com
  'guides.games_title': 'Game guides',
  'guides.games_description': 'Flag Guesser, Letter Trail, Hold the Line, Loose Ends and game points have their guides on NotSoGames, where you can play the games in your browser too.',
  'guides.games_open': 'Open on notsogames.com',
  // the Activity's "How to play" sheet (src/components/guides/GuideSheet.tsx)
  'guides.sheet.open_game': 'How to play',
  'guides.sheet.open_editor': 'How it works',
  'guides.sheet.guide': 'Guide',
  'guides.sheet.details': 'The details',
  'guides.sheet.full': 'Full guide on notsobot.com',
  'guides.sheet.full_games': 'Full guide on notsogames.com',
  'guides.sheet.loading': 'Loading the guide',
  'guides.sheet.failed': 'Couldn’t load the guide.',
  'guides.sheet.retry': 'Try again',
  'guides.sheet.all_rules': 'All the rules',
  // the ? button's name while its guide's never been opened (it has a dot)
  'guides.sheet.unopened': '{label}, not opened yet',
} as const;
