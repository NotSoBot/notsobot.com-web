// Changelog content, newest day first. Only changes people using the bot or the website would notice: new commands,
// new options, visible fixes and removals. Internal work (refactors, infra, staff tools) stays out.
// Item text is Discord-flavored markdown (`code`, **bold**), rendered by the Markdown component.
// MediaScript actions and TagScript functions count as user-facing, they start with **MediaScript:** or **TagScript:**.

export type ChangeKind = 'new' | 'improved' | 'fixed' | 'removed';

export interface ChangelogItem {
  kind: ChangeKind,
  text: string,
}

export interface ChangelogDay {
  // YYYY-MM-DD, also the day's anchor (`/changelog#2026-10-18`)
  date: string,
  title: string,
  items: Array<ChangelogItem>,
}


export const CHANGE_KIND_LABELS: Record<ChangeKind, string> = {
  new: 'New',
  improved: 'Improved',
  fixed: 'Fixed',
  removed: 'Removed',
};


export const CHANGELOG: Array<ChangelogDay> = [
  {
    date: '2026-10-18',
    title: 'Vocoder, Vegas projects and better help',
    items: [
      {kind: 'new', text: '`.vocoder` and `/media-av audio vocoder`.'},
      {kind: 'new', text: '`.veg` and `/media-aiv veg`: attach a Vegas `.veg` project (or give its link) with your media and NotSoBot renders it. Add `-nocutoff` to keep the full length.'},
      {kind: 'new', text: '`.tvsimulator` has `-vertical`, `-linesync` and `-detailzoom`.'},
      {kind: 'new', text: '`.emoji` has `-size`.'},
      {kind: 'new', text: 'Five new `.code` languages: **Bun**, **C#**, **Kotlin**, **Perl** and **SQLite**. C23, C++23, Java 27, Lua 5.5 and Python 3.14 are the new defaults, and every other language was updated to its latest version.'},
      {kind: 'new', text: 'A **Logo Editing** category in the Tag Directory.'},
      {kind: 'improved', text: '`.help <command>` now has an **Arguments** section explaining each option and its allowed range.'},
      {kind: 'improved', text: 'Slow commands show a random "still processing" message instead of a plain "Thinking...".'},
      {kind: 'improved', text: 'Timed bans that expire now leave a full audit log reason: who banned, when, for how long and why.'},
      {kind: 'improved', text: '`.tag info` uploads long tag content as a file, and tag replies put their text above a single attached file.'},
      {kind: 'improved', text: 'Very long error messages are sent as a file instead of being cut off.'},
      {kind: 'new', text: '**MediaScript:** `vocoder` (alias `vocode`) makes the voice in your media sing another media\'s music.'},
      {kind: 'new', text: 'nsb.gg has a home page.'},
    ],
  },
  {
    date: '2026-10-17',
    title: 'AI memory, timed bans and new moderation commands',
    items: [
      {kind: 'new', text: '**AI memory**: NotSoAI can remember things about you between conversations. See them with `.ai memory`, remove one with `.ai memory forget`, wipe them with `.ai memory clear`, or turn it off with `.set my ai memory`. Replies that changed a memory get a 🧠 note.'},
      {kind: 'new', text: 'Timed bans: `.ban <user> -for <duration>` (or the `duration` option on `/ban`). They lift on their own, `.unban` clears them, and `.bans -timed` lists them.'},
      {kind: 'new', text: 'New moderation commands: `.mute` (timeout), `.unmute`, `.nick`, `.pin`, `.clean`, `.bans` and `.invites`, all with slash versions.'},
      {kind: 'new', text: '`.prune` can filter by `-bots`, `-attachments`, `-embeds` and `-images`.'},
      {kind: 'new', text: '`.tvsimulator` (`.tvsim`), `.audio multipitch` and `.audio bitcrush` (`.audio crush`).'},
      {kind: 'new', text: '`.emojimosaic` (`.e2m`), `.emojify` and `.emojify vertical`.'},
      {kind: 'new', text: '`.wordcloud user`, and a user option on `/wordcloud`.'},
      {kind: 'new', text: 'Every eyes command has `-flipped`.'},
      {kind: 'new', text: 'Imgur search results, paginated and safety scanned.'},
      {kind: 'new', text: 'New AI models: MiniMax M3, Xiaomi MiMo v2.6 Pro, GLM 5.3 and GLM 5.3 Flash. The `/ai` model list now shows which premium tier each one needs.'},
      {kind: 'new', text: 'You get a DM when staff reply to your report or change its status.'},
      {kind: 'improved', text: 'Server settings moved under `/server` (allowlist, blocklist, command-allowlist, command-blocklist, command-usage, loggers, prefixes, set), and `/utils` is now `/bot`.'},
      {kind: 'improved', text: 'Timezone search understands offsets (`utc+9`, `-3:30`), abbreviations, countries and summer time, and `/settings set timezone` warns about timezones it doesn\'t know. Added Vancouver, Edmonton and Winnipeg.'},
      {kind: 'improved', text: 'Ban and kick reasons in the audit log use the server\'s language, and the DM the member gets uses theirs.'},
      {kind: 'improved', text: 'Info and search commands (user, server, role, channel, invite, 4chan, reddit, weather and more) use a more compact layout.'},
      {kind: 'improved', text: 'A tag that replies with just one file now looks like a media command\'s reply. YouTube search results have a cleaner layout.'},
      {kind: 'improved', text: 'Tags get more time to run with premium: 45 seconds, 90 with Premium and 120 with Plus.'},
      {kind: 'improved', text: 'Publishing a tag to the directory asks you to confirm you made it or have permission to share it. Voice cloning asks for confirmation before your audio is sent.'},
      {kind: 'improved', text: 'The Half-Life pistol, shotgun and SMG overlays are back. `merge` now works as an alias of `.join`.'},
      {kind: 'fixed', text: '`.badmeme` skips memes with no image and retries instead of failing.'},
      {kind: 'removed', text: 'The Kimi K2.6 AI model.'},
      {kind: 'new', text: '**MediaScript:** `ffmpeg` for running your own ffmpeg filters, `reexport` (`ihtx`) to run code on a clip over and over and join the results, `loadcube` and `applylut` for color grading with `.cube` LUTs, `loadveg` and `vegrender` for Vegas projects, plus `tvsimulator`, `multipitch` and `audiobitcrush`.'},
      {kind: 'new', text: '**TagScript:** `{ai.memory.add}`, `{ai.memory.edit}`, `{ai.memory.delete}` and `{ai.memory.clear}` let NotSoAI tags manage what it remembers (up to 3 changes per message).'},
      {kind: 'new', text: 'MediaScript has its own docs page on the website, with a guide to recreating classic logo effects.'},
    ],
  },
  {
    date: '2026-10-16',
    title: 'Admin bypass, smarter edits and file pages',
    items: [
      {kind: 'new', text: 'Admin bypass for the allowlist, blocklist and command lists: turn it off for a list (or one entry) and server admins have to follow it too. Owners and admins can always use the list commands, so nobody gets locked out.'},
      {kind: 'new', text: 'Tag Directory links posted in the channel show up first in `tag get` and `tag show` suggestions, and `.tag get` with no arguments grabs the newest one.'},
      {kind: 'improved', text: 'Editing a command\'s message re-runs it and cancels the old run, and deleting the message cancels it, so you never get a stale reply.'},
      {kind: 'improved', text: 'A clearer message when the API is down or restarting, and a notice when Google Translate returns your text untranslated.'},
      {kind: 'improved', text: 'Uploaded files use the new reply layout, keeping Discord\'s own player for audio.'},
      {kind: 'new', text: 'nsb.gg links open a proper file page: an audio/video player, syntax-highlighted code with line links, and nicer Discord embeds with a download link.'},
      {kind: 'new', text: 'Tag Directory and command links from notsobot.com get rich Discord embeds, with an **Add to Server** button for tags. Commands have their own links (`/commands/<name>`).'},
      {kind: 'improved', text: 'Tag Directory descriptions support Discord markdown.'},
      {kind: 'fixed', text: 'File embeds on nsb.gg showing backslashes in the filename.'},
    ],
  },
  {
    date: '2026-10-15',
    title: 'Tag fixes',
    items: [
      {kind: 'improved', text: '`.tag add` is now `.tag get`, to fetch a tag from the Tag Directory or your DMs.'},
      {kind: 'new', text: '`.wiggle` has `-loop` and `-speed`.'},
      {kind: 'new', text: '**MediaScript:** `contrastmultiply` scales contrast while keeping colors (0 is flat gray, negatives invert brightness).'},
      {kind: 'improved', text: '`.tag info` links to the tag\'s Tag Directory page and shows dates in your own timezone.'},
      {kind: 'fixed', text: 'Tag Directory edits now explain why they failed (like the name being taken) instead of leaving the buttons up.'},
    ],
  },
  {
    date: '2026-10-14',
    title: 'Tags are back, plus 40 new image commands',
    items: [
      {kind: 'new', text: '**Tags are back**, with new safety filters. Thank you for your patience while they were offline.'},
      {kind: 'new', text: 'Report a tag with `.tag report`, or right-click any user or message and pick **Report**. See the reports you\'ve sent with `/reports`.'},
      {kind: 'new', text: 'Image commands: `.hacker`, `.presidential`, `.realfact`, `.sonic`, `.thonkify`, `.watchmojo`, `.analysis`, `.excuse` and `.kirby`.'},
      {kind: 'new', text: 'Meme overlays: 9gag, adidas, ajit, austin, bandicam, binoculars, black panther, cool guy, dork, god, gold star, hypercam, idubbbz, jack, jesus, keem, miranda, mistake, old guy, owo, perfection, respects, rtx, stock, supreme, thinking, trump, wheeze, yusuke and zuckerberg.'},
      {kind: 'new', text: '`/tag directory verify` to request the verified badge for your directory tag.'},
      {kind: 'new', text: '`/legal privacy`, `/legal terms` and `.terms`.'},
      {kind: 'fixed', text: 'Tags sending the same file more than once when it was used in several places.'},
    ],
  },
  {
    date: '2026-10-13',
    title: 'Tag docs, permission checks and lots of fixes',
    items: [
      {kind: 'new', text: 'The tag scripting docs are on the website: the full syntax and every function, searchable.'},
      {kind: 'improved', text: '`/help-permissions-check` can check a specific command, including whether the server\'s command lists block it.'},
      {kind: 'improved', text: 'Tags run noticeably faster.'},
      {kind: 'new', text: '**TagScript:** `{api.fetch.reminders}`, `{api.edit.reminder}` and `{api.delete.reminder}` to manage reminders from a tag.'},
      {kind: 'new', text: '**TagScript:** `{api.utilities.qr.create}` and `{api.utilities.qr.scan}` for QR codes, and `{api.utilities.screenshot}` to screenshot a website.'},
      {kind: 'new', text: '**TagScript:** `{settings.set.user.locale}` and `{settings.set.user.timezone}` to read or change your language and timezone.'},
      {kind: 'fixed', text: '`{math}` in tags: commas inside functions (`max(1,234)`), matrices like `[1,2]`, decimals in `{max}`/`{min}`, and repeating decimals rounding wrong.'},
      {kind: 'fixed', text: '`.remind me ...` cutting "me" off the start of words like "meeting".'},
      {kind: 'fixed', text: 'Premium servers losing their custom commands, and media commands only finding the first image in a gallery message.'},
      {kind: 'fixed', text: 'NSFW 4chan boards showing outside NSFW channels when picked by name.'},
      {kind: 'removed', text: 'The rule34, rule34 paheal, e621 and e926 search commands (disabled since Oct 10) are gone for good, along with the brazzers overlay.'},
    ],
  },
  {
    date: '2026-10-12',
    title: 'NotSoBot speaks your language, and a new website',
    items: [
      {kind: 'new', text: 'NotSoBot is translated into **33 languages**. It replies in your Discord language, or the one you or your server picked in settings.'},
      {kind: 'new', text: 'A brand new notsobot.com: browse every command with usage and examples, search the Tag Directory, read the FAQ and check live bot status.'},
      {kind: 'new', text: 'Image commands: `.acid`, `.charcoal`, `.dice`, `.drawfaces`, `.layer`, `.multiply`, `.pixelsort`, `.quadart`, `.rgbsplit`, `.scramble`, `.cartoon`, and animated `.explode`/`.implode`/`.charcoal` gifs.'},
      {kind: 'new', text: 'Animations: `.flash`, `.inout`, `.outin`, `.rainbow`, `.sidetoside` and `.uptodown`.'},
      {kind: 'new', text: 'Overlays: wasted and who did this. `.audio channels invert` for audio.'},
      {kind: 'new', text: 'Slash versions of many more commands: user and server info, avatar, search (4chan, DuckDuckGo, Google reverse image, Imgur, Reddit, Urban Dictionary, WikiHow, Wolfram Alpha), OCR and transcribe translate, eyes, mirror, flag overlays, prune, mass nickname, loggers and more.'},
      {kind: 'new', text: '`.report` to send a bug, user or server report to the NotSoBot team.'},
      {kind: 'new', text: '`.tag import` brings back tags from a NotSoBot tag export, and `/tag storage export` exports a tag\'s saved data.'},
      {kind: 'fixed', text: '`.prune` stopping early on messages older than two weeks.'},
    ],
  },
  {
    date: '2026-10-11',
    title: 'Server logging rework',
    items: [
      {kind: 'improved', text: 'Server logs were rebuilt: clearer member, message, role, channel, voice, ban and user log entries.'},
      {kind: 'new', text: '`.loggers add channels` to log channel changes.'},
      {kind: 'new', text: 'A server setting to choose how NotSoBot\'s responses are displayed (`/server set response-display`).'},
    ],
  },
  {
    date: '2026-10-10',
    title: 'Safety changes, new effects and slash moderation',
    items: [
      {kind: 'removed', text: '**Tags are turned off for now.** Discord asked us to remove the tag system over content moderation concerns. We\'re adding new safety filters and talking with Discord about keeping it.'},
      {kind: 'removed', text: 'NSFW commands (rule34, rule34 paheal, e621 and e926) are disabled at Discord\'s request, and every media command now goes through a safety check.'},
      {kind: 'new', text: '`.glow` adds a soft glow to an image or video (`-amount`).'},
      {kind: 'new', text: '`.watermark` puts a second image small in the corner of the first, with `-size`, `-opacity` and `-margin`.'},
      {kind: 'new', text: 'The three triggered styles are now their own commands: `.triggered` (shaking), `.triggered2` and `.triggered3`.'},
      {kind: 'new', text: '`/undo` removes your last commands\' replies in the channel.'},
      {kind: 'new', text: '`/moderation ban`, `kick` and `unban`, plus `/moderation allowlist` and `/moderation blocklist`. You can also allowlist or blocklist someone by right-clicking them.'},
      {kind: 'new', text: 'Premium: reply to one of NotSoBot\'s messages to keep talking to NotSoAI, no prefix needed.'},
      {kind: 'new', text: '`/settings set app-command-response-type` to make NotSoBot\'s slash command replies always private (only you can see them).'},
      {kind: 'improved', text: 'When command messages are bulk deleted, NotSoBot deletes its replies to them too.'},
      {kind: 'improved', text: 'New `.tag generate` models: Claude Sonnet 5.5 and Haiku 5.5, ChatGPT 6 Luna and 6.1 Sol, Grok 4.7, and MiMo v2.6 Pro and Flash. Gemini 3.1 Pro, Gemini 3.5 Flash Lite, Kimi K3 and Qwen 3.7 Plus were retired.'},
      {kind: 'improved', text: '`.e2p` is now `.edges2flesh` (`.e2f`), and `.e2e` is now `.edges2emoji`.'},
      {kind: 'improved', text: '`/privacy` replies privately and links to notsobot.com.'},
      {kind: 'fixed', text: 'Pinterest video downloads.'},
      {kind: 'removed', text: '`.imagine video`, and `/settings opt-out content`.'},
      {kind: 'new', text: '**MediaScript:** `glow`, `watermark`, `shaketriggered` (`triggered`), `labeltriggered2` (`triggered2`) and `labeltriggered3` (`triggered3`).'},
      {kind: 'new', text: '**TagScript:** `{settings.set.user.ai.personality}` and `{settings.set.server.ai.personality}` to read, set or clear the NotSoAI personality.'},
    ],
  },
  {
    date: '2026-10-08',
    title: 'Safety scanning and faster effects',
    items: [
      {kind: 'improved', text: 'All media NotSoBot handles is now scanned for gore and child safety content, including files your `.code` runs create.'},
      {kind: 'improved', text: '`.legofy` and `.pix2pix` are faster, and `.stammer` got some fixes.'},
      {kind: 'improved', text: '**MediaScript:** error messages say which line the problem is on.'},
      {kind: 'removed', text: '**MediaScript:** `imaginevideo` and `editvideo`.'},
    ],
  },
  {
    date: '2026-09-12',
    title: 'Download fixes and new sites',
    items: [
      {kind: 'new', text: '`.download` supports Klipy, Pinterest, SoundCloud and X.'},
      {kind: 'fixed', text: '`.download` for Facebook, Instagram, Reddit, Threads and TikTok.'},
      {kind: 'improved', text: 'Transcription is more stable.'},
      {kind: 'fixed', text: 'mp3 and flac files breaking audio commands, and the `.meme` command.'},
      {kind: 'fixed', text: '**MediaScript:** math with multiple sets of parentheses.'},
    ],
  },
  {
    date: '2026-09-11',
    title: 'Derain, kick messages and permission checks',
    items: [
      {kind: 'new', text: '`.derain`, the opposite of the rain tint.'},
      {kind: 'new', text: '`/help-permissions-check` shows which permissions NotSoBot is missing.'},
      {kind: 'new', text: '`.kick` can send the member a message.'},
      {kind: 'new', text: 'A **Make Permanent Using Nitro** button on files too big to attach, so someone with a bigger upload limit can re-upload them as a real attachment.'},
      {kind: 'improved', text: 'Media slash commands moved out of the `-tools` groups: `/media-aiv` concat, join, overlay, reverse, seesaw, snip and speed, plus `/media-av convert` and `/media-iv convert`.'},
      {kind: 'improved', text: 'New `.tag generate` models: Claude Sonnet 5, DeepSeek Flash and Pro, Gemini 3.8 Flash, Meta Muse Spark 1.3, Kimi K3, Nemotron 3 Ultra, ChatGPT 5.6 Luna and Terra, Qwen 3.8, Grok 4.6 and GLM 5.3.'},
      {kind: 'new', text: '**MediaScript:** `derain`.'},
      {kind: 'new', text: '**TagScript:** `{tagcontent}` outputs the original tag\'s content when the tag is an alias.'},
    ],
  },
];
