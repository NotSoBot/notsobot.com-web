// FAQ content. Answers use a tiny markup that FaqPage renders:
//   `code`, [label](url or /path), blank line = new paragraph, lines starting with "- " = list.
// Facts here are checked against notsobot.ts (prefixes, permissions, settings) as of the category rework.
// Other languages are faq.<language>.ts, keyed by these ids; keep them in step when an answer changes.

import { Languages, type Language } from '@/i18n/languages';


export type FaqSectionId = 'start' | 'commands' | 'server' | 'premium' | 'privacy';

export interface FaqSection {
  id: FaqSectionId,
  title: string,
  description: string,
}

export interface FaqQuestion {
  id: string,
  section: FaqSectionId,
  question: string,
  answer: string,
}


export const FAQ_SECTIONS: Array<FaqSection> = [
  {id: 'start', title: 'Getting Started', description: 'Adding the bot and running your first command.'},
  {id: 'commands', title: 'Commands & Media', description: 'Images, videos, downloads and file limits.'},
  {id: 'server', title: 'Server Setup', description: 'Prefixes, permissions, restrictions and logging.'},
  {id: 'premium', title: 'Premium & AI', description: 'NotSoPremium tiers and NotSoAI.'},
  {id: 'privacy', title: 'Privacy & Support', description: 'Your data and where to get help.'},
];


export const FAQ_QUESTIONS: Array<FaqQuestion> = [
  // getting started
  {
    id: 'add-to-server',
    section: 'start',
    question: 'How do I add NotSoBot to my server?',
    answer: 'Use the [Add to Discord](/invite) button and pick your server. You need the **Manage Server** permission in that server to add bots.\n\nOnce it joins, try `.help` or type `/` in any channel to browse its slash commands.',
  },
  {
    id: 'use-without-server',
    section: 'start',
    question: 'Can I use NotSoBot without adding it to a server?',
    answer: 'Yes. You can add NotSoBot to your Discord account instead of a server. Its slash commands and right-click menu commands (like **Download** or **OCR** on a message) then work in DMs and in servers that allow external apps.\n\nPrefix commands like `.magik` only work in servers the bot has been added to.',
  },
  {
    id: 'how-to-run-commands',
    section: 'start',
    question: 'How do I run a command?',
    answer: 'There are three ways:\n\n- Type the prefix and the command name, like `.magik` (the default prefix is `.`)\n- Mention the bot instead of a prefix, like `@NotSoBot magik`\n- Use slash commands by typing `/` and picking one\n\nThe [command list](/commands) shows every command, its usage and examples.',
  },
  {
    id: 'not-responding',
    section: 'start',
    question: 'The bot isn\'t responding to my commands. What\'s wrong?',
    answer: 'Usually it\'s one of these:\n\n- **Missing permissions.** NotSoBot needs View Channel, Send Messages, Embed Links, Attach Files and Read Message History in that channel. Run `/help-permissions-check` to find out what\'s missing.\n- **A different prefix.** The server may have set a custom prefix, which replaces `.`. Mention the bot (`@NotSoBot prefixes`) to see which ones are active.\n- **The channel, your role or the command is restricted.** Server admins can limit where and by whom the bot is used (see [Server Setup](#section-server)).',
  },

  // commands & media
  {
    id: 'image-input',
    section: 'commands',
    question: 'How do I use an image command on a specific picture?',
    answer: 'Image and video commands take their input from, in order of preference:\n\n- A file attached to your message\n- A message you\'re replying to\n- A URL, a custom emoji, or a user (for their avatar), like `.magik @someone`\n\nIf you don\'t give it anything, NotSoBot uses the most recent image or video in the channel.',
  },
  {
    id: 'chain-effects',
    section: 'commands',
    question: 'Can I apply several effects at once?',
    answer: 'Yes, with `.pipe`. Separate the commands with semicolons, for example `.pipe flip; flop`. Up to 5 commands can be chained, and each one runs on the result of the one before it.',
  },
  {
    id: 'download-videos',
    section: 'commands',
    question: 'How do I download a video from TikTok, Instagram, YouTube and so on?',
    answer: 'Use `.download <url>` or `/download`. You can also right-click (or long-press) a message containing a link and choose **Apps → Download**.\n\nTo change the default video quality for your downloads, use `/settings set download-quality`.',
  },
  {
    id: 'files-as-links',
    section: 'commands',
    question: 'Why did I get a link instead of a file?',
    answer: 'When a result is bigger than Discord lets the bot upload, NotSoBot hosts it on [nsb.gg](https://nsb.gg) and sends you a link instead. Those links are temporary: they last 14 days, or 28 days with NotSoPremium.\n\nYou can control when this happens with `/settings set file-upload-threshold` and `/settings set file-upload-type`.',
  },
  {
    id: 'undo',
    section: 'commands',
    question: 'How do I delete the bot\'s response to my command?',
    answer: 'Run `.undo` in the same channel to remove the bot\'s responses to your last command, or `.undo 5` for your last five.',
  },
  {
    id: 'nsfw',
    section: 'commands',
    question: 'Why was my result blocked, or why can\'t I use NSFW commands?',
    answer: 'NSFW commands only work in channels marked as **age-restricted**. In other channels, NotSoBot scans media it produces and blocks anything that may be NSFW. Searches use SafeSearch unless the channel is age-restricted.\n\nTo allow NSFW results, a server admin has to mark the channel as age-restricted in its channel settings.',
  },

  // server setup
  {
    id: 'change-prefix',
    section: 'server',
    question: 'How do I change the bot\'s prefix?',
    answer: 'Use `.prefixes add <prefix>` to add one, `.prefixes replace <prefix>` to swap all of them for a single new one, and `.prefixes remove <prefix>` to remove one. These need the **Manage Server** permission.\n\nOnce a server has custom prefixes, the default `.` stops working there. Mentioning the bot always works, so `@NotSoBot prefixes` shows what\'s active.',
  },
  {
    id: 'restrict-channels',
    section: 'server',
    question: 'How do I limit NotSoBot to certain channels, roles or users?',
    answer: 'Use rules (`.rules` or `/server rules`). Rules covering every command need **Administrator**:\n\n- `.rules block everything` then `.rules allow everything -channels bot-commands`: the bot only responds in #bot-commands\n- `.rules block everything -channels general -roles Muted`: the bot ignores #general and the Muted role\n\nThe most specific rule wins: a user beats a role, a role beats a channel, and a channel beats the whole server. Run `.rules` to see them all, or `.rules check <command>` to see which rule decides.',
  },
  {
    id: 'disable-command',
    section: 'server',
    question: 'How do I turn off a specific command or category?',
    answer: 'Use `.rules block <command or category>`, for example `.rules block rule34` or `.rules block category:fun`. Add `-channels` to only turn it off in certain channels, and `-message` to tell people where to go instead: `.rules block fun -channels general -message Fun commands go in #bots`. This needs the **Manage Server** permission.',
  },
  {
    id: 'loggers',
    section: 'server',
    question: 'Can NotSoBot log what happens in my server?',
    answer: 'Yes. Set up loggers for bans, channels, members, messages, roles, users and voice, for example `.loggers add messages -channel message-logs`. Run `.loggers` to see what\'s currently being logged and where.',
  },
  {
    id: 'language',
    section: 'server',
    question: 'Can NotSoBot reply in my language?',
    answer: 'Yes, it\'s available in 33 languages. Use `/settings set locale` to pick yours, or `/settings-server set locale` to set the server\'s default.',
  },

  // premium & ai
  {
    id: 'premium',
    section: 'premium',
    question: 'What is NotSoPremium?',
    answer: 'NotSoPremium is an optional subscription, bought through Discord on NotSoBot\'s profile. It comes in three tiers:\n\n- **NotSoPremium**: bigger files, more time for every command and your own custom commands\n- **NotSoPremium Plus**: everything above, plus 2 premium server slots and voice cloning\n- **NotSoPremium Plus AI**: everything above, plus NotSoAI\n\nWith **NotSoPremium Plus** you can give up to 2 servers (or group DMs) your premium with `/settings premium-servers add` or from the dashboard\'s Premium page, so some premium commands work there for everyone. Owning a server doesn\'t give it premium by itself.',
  },
  {
    id: 'notsoai',
    section: 'premium',
    question: 'How do I talk to NotSoAI?',
    answer: 'Mention the bot with a message, or reply to one of its messages, and NotSoAI will answer. It needs **NotSoPremium Plus AI**, either yours or from a member who gave the server their premium. You can set its personality with `/settings set ai-personality`.',
  },

  // privacy & support
  {
    id: 'data',
    section: 'privacy',
    question: 'What data does NotSoBot store about me?',
    answer: 'Your basic Discord profile (ID, username, avatar), the settings you choose, tags you create, and records of which commands you use. The [Privacy Policy](/legal/privacy) has the details.',
  },
  {
    id: 'delete-data',
    section: 'privacy',
    question: 'How do I get my data deleted?',
    answer: 'Log in to the [dashboard](/dashboard/settings#your-data) and use **Delete my data** at the bottom of your settings. You can also email [privacy@notsocompany.com](mailto:privacy@notsocompany.com) from an address you can verify, and include your Discord user ID.',
  },
  {
    id: 'support',
    section: 'privacy',
    question: 'Where do I report a bug or get more help?',
    answer: 'Join the [support server](/support) and ask there. Include the command you ran and what happened, and a screenshot if you can.',
  },
  {
    id: 'created',
    section: 'privacy',
    question: 'When was NotSoBot created?',
    answer: 'April 16, 2016.',
  },
];


// a language's text for every section and question, by id (whatever's missing stays in English)
export interface FaqTranslation {
  sections: Record<FaqSectionId, Omit<FaqSection, 'id'>>,
  questions: Partial<Record<string, Pick<FaqQuestion, 'question' | 'answer'>>>,
}

// English ships with the page, every other language is its own chunk (a language without one is a type error)
const LOADERS: Readonly<Record<Exclude<Language, typeof Languages.ENGLISH>, () => Promise<FaqTranslation>>> = Object.freeze({
  [Languages.SPANISH]: async () => (await import('./faq.es')).FAQ_SPANISH,
  [Languages.PORTUGUESE]: async () => (await import('./faq.pt')).FAQ_PORTUGUESE,
});

export async function loadFaqTranslation(language: Language): Promise<FaqTranslation | null> {
  return (language === Languages.ENGLISH) ? null : LOADERS[language]();
}

// null is English
export function localizedFaq(translation: FaqTranslation | null): {sections: Array<FaqSection>, questions: Array<FaqQuestion>} {
  if (!translation) {
    return {sections: FAQ_SECTIONS, questions: FAQ_QUESTIONS};
  }
  return {
    sections: FAQ_SECTIONS.map((section) => ({...section, ...translation.sections[section.id]})),
    questions: FAQ_QUESTIONS.map((question) => ({...question, ...translation.questions[question.id]})),
  };
}


// plain text for searching (markup stripped)
export function faqSearchText(question: FaqQuestion): string {
  return `${question.question} ${question.answer}`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*]/g, '')
    .toLowerCase();
}
