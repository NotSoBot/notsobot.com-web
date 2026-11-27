import type { LegalDocument } from './legal';

export const PRIVACY_POLICY: LegalDocument = {
  title: "Privacy Policy",
  effective: "October 13, 2026",
  lastUpdated: "November 27, 2026",
  intro: "This Privacy Policy explains what information NotSoBot collects, why, who it's shared with, how long it's kept, and how You can get a copy of it or have it deleted.",
  sections: [
    {
      title: "Section 1 - Who We Are",
      blocks: [
        {type: 'paragraph', text: "NotSoBot is operated by Not So LLC (doing business as NotSoCompany), a Delaware limited liability company, 254 Chapman Rd, Ste 208 #8692 Newark, Delaware 19702 (\"We\", \"Us\" or \"Our\"). This policy covers the NotSoBot Discord application, the website at notsobot.com, and the NotSoBot API (together, the \"Service\"). Words that are capitalized and not defined here have the meaning given in Our Terms of Service."},
        {type: 'paragraph', text: "Discord's own privacy policy covers how Discord handles your data. This policy only covers what NotSoBot does."},
      ],
    },
    {
      title: "Section 2 - Information We Collect",
      blocks: [
        {type: 'paragraph', text: "We only collect what's needed to run the features You use, keep the Service secure, and prevent abuse. Depending on which features You use, this includes:"},
        {type: 'list', items: [
          "Discord account information: your user ID, username, discriminator, avatar, account flags, and the ID of your DM channel with NotSoBot. This comes from Discord when You use a command, or when You open NotSoBot's Discord Activity for the first time. Your profile's banner color is also saved when You log in to the dashboard, to show on your dashboard profile.",
          "Your settings: language, timezone, units, response display preferences, file upload preferences, selected AI models and personality, text-to-speech voice, default font for captions and memes, and the servers You pinned on the website's dashboard.",
          "Server information and settings for servers NotSoBot is in: server ID, name, icon, features, language, timezone, custom prefixes, default font, AI settings, what the server's admins told NotSoAI about the server along with who added each one, and the rules for who can use which commands along with who added each rule.",
          "Warnings a server's moderators give with the warn command: the server, the warned member's user ID, the moderator's user ID, the reason and when it was given. The warned member is sent the warning in a DM.",
          "Warnings from NotSoBot's staff: your user ID, the staff member's user ID, the reason, when it was given, whether it reached You in a DM, and when You saw it. You're sent it in a DM, shown it before your next command, and can see and dismiss it on the dashboard. Being blocked from the Service gives You one too, and a block can be set to end on its own at a set time.",
          "Reports members send to a server's moderators with /report, the report command or Report to Mods: the server, who sent it, who was reported, the reason, when it was sent, its status and the moderator who last resolved or dismissed it. A report of a member also keeps an image of them from when it was sent (their avatar, nickname and username), and a report of a message keeps the message's channel and message IDs, its text and an image of the message (showing its author's name and avatar, its text, and its images and embed), so moderators can still see them if they change or the message is deleted. If an image may contain NSFW content, it's kept with every picture in it (avatars, attachments, embeds and emojis) replaced by a plain block. The text and images are deleted 30 days after the report. Replies between the member who sent it and the moderators are kept with the report too (what was written, who wrote it and when), along with each time it was resolved, dismissed or reopened. The member gets the moderators' replies in a DM from \"the moderators\", without the moderator's name.",
          "Logging settings: if a server enables logging, the channel and webhook used to post logs, including the webhook token. Log events are sent to that webhook and are not kept by Us.",
          "Decoy channel settings: if a server sets up a decoy channel, the channel, who set it up, the webhook that posts and deletes its bait messages (including the webhook token), its notice (NotSoBot's text, or the IDs of the member and message whose own message is the notice), how many members it has removed and when it last did. We don't keep the messages people post in it.",
          "Command replies: the IDs of your command message, its channel, the command used, and NotSoBot's reply, so that editing or deleting your command can update or remove the reply.",
          "Command usage statistics: which command was used, when, how it was started, how it ended and how long it took, the language of the reply, and the server, channel and user IDs involved.",
          "Tags: names, content, variables, attached media, usage counts and directory listings for tags You create, and each time a tag is used (the tag, who used it, the server and when).",
          "Music stats: each song that plays in a server (its title, artist and link), who queued it, how long it played and when, so the server can see what it played the most.",
          "Voice audio, only while someone uses the music listen command: NotSoBot hears its voice channel (everyone in it mixed together, or the one person picked) for up to 2 minutes, to find the song being played there. It's only held in memory while it listens and is never saved. Only a fingerprint of it is sent to ACRCloud (see Section 7).",
          "Reminders: reminder text, times, and the channel and message they belong to.",
          "Reports You send to Us with /bot report (or the bot report command), Report to NotSoBot, by asking NotSoAI, or from the website, including the text, the server, channel and message IDs involved, and Our review notes. Bug and tag reports sent from the website without logging in aren't linked to any account. Instead We keep a one-way hash of the IP address they came from, to limit how many can be sent and to spot abuse. The IP address itself isn't stored with the report.",
          "Uploaded files: files You ask NotSoBot to host, their file names, sizes, dimensions and a file hash (BLAKE2b), and a preview image made from each video or audio file (a frame, its cover art or its waveform).",
          "Media editor: if You use the media editor on the website or as a Discord Activity, a copy of the file You opened (kept with your uploaded files), the edits You made to it, up to 10 pictures, videos or sounds You add to it as overlays or audio (also kept with your uploaded files), small preview copies, and for an edit made in an Activity, the Activity's ID, the server it's in (or the channel, in a DM), and the room's name and, if its creator gave it a password, a hash of the password (never the password itself). When NotSoBot launches the Activity, it notes for each person who launched it, the server and channel, your language and what it was opened on (media, a template or a room You were invited to). An Activity opened in an App Channel (a server channel that runs the Activity itself) has no Activity ID, so that channel's ID takes its place.Everyone in a server's Activity, from any of its channels, can see that server's rooms: each room's name, creator and who's in it (username and avatar), and for a room without a password, its file name, preview and effects. Everyone in a room can edit it, unless its creator made it watch-only, and sees where the others' pointers are. Pointer positions are passed on live and never stored. A room's creator and the server's moderators can remove people from it, close it or delete it, and We remember who was removed for 7 days so they can't rejoin. A room is deleted if its creator is banned from that server or blocked from NotSoBot. When someone in a room replaces its media, the new file is kept with the room creator's files, with a note of who added it, when, and the link it came from (the room sees who and when, not the link). While You're connected to the rooms, We check again every few seconds that You're still in the Activity. To check who's a moderator, We look up your permissions in that server through NotSoBot and keep the answer for about a minute. Templates You save keep a name, the edits, the overlay and audio files they use, how many times they've been used and, if You lock one with a password, a hash of the password (never the password itself). Template links aren't listed anywhere unless You publish the template, but they aren't secret either: anyone with one can see the template's name and your username and avatar, and its edits and files unless it's locked, and a posted link shows the same in its preview. When You use a template, in the editor or through a tag's MediaScript, We note that You used it and when You first and last did; the Template Hub ranks templates by how many people used them. If You publish a template to the Template Hub, anyone can see it on notsobot.com, logged in or not: its name, the description You give it, its effects and what it asks for, a preview made by running it on Our own sample media, your username and avatar, and how many people have used it. Before a template is published, and again whenever a published one changes, its text is scanned, its preview is checked like other media and its drawings are read for text (Section 7). One We're unsure of waits for Our team. Anyone can report a published template with a reason and an optional note, which reaches Our team as a safety flag, and someone with three publishes rejected within 30 days can't publish for 7 days. Sharing a render or a template from the Activity has NotSoBot post it in that channel under your name: the render's file and its effects, or the template's name, effects and an example picture from your preview. An invite to a room keeps who made it and which room it's for. Game rooms (Flag Guesser and Letter Trail) keep their name, a hash of their password if they have one, whether they're watch-only or solo, and each player's username, avatar, answers or words and score. A room its creator makes global is listed in every server's Activity with the creator's username and avatar, the server it comes from and who's in it. When You open an in-chat Flag Guesser game in the Activity, We keep its flag and difficulty until a room is made with it.",
          "Game points: the points You earn in NotSoBot's games, per game and server, and each award with when and where it was earned, to apply the daily cap and the weekly boards. Anyone can see your totals and rank with /games points, and the server and global leaderboards show the top players' usernames and points.",
          "AI requests: the prompt, including any messages You replied to with the ai command, along with the model, generated response, any error and token counts.",
          "AI memory: short facts NotSoAI saves about You when You ask it to remember something, whether each one applies everywhere or only in one server, when it was saved, and whether You've turned memory off.",
          "Cloned voices: the voice's name, what is needed to use the voice (for a voice made on Our own servers, a short list of numbers describing how it sounds; for an older one, the ID of the voice stored at fish.audio or ElevenLabs), and the speech from the audio clips You cloned it from (silence, music and noise around the speech are cut out before a clip is stored). A server's own cloned voices also keep the server and who cloned each one, which the server's members can see on the dashboard along with the voice's clips.",
          "Saved fonts: fonts You (or a server's members) save to use by name, kept as the file that was uploaded, along with its name, the file's original name, size and a file hash (SHA-256), who saved it, when, and a preview image of a sample line in the font. They're only reachable through NotSoBot and the logged-in dashboard, not from a public link.",
          "Adding and removing NotSoBot: when You add NotSoBot to your account or to a server, log in to the website with Discord, or remove NotSoBot from your authorized apps, Discord tells Us your user ID, the server it was added to, the permissions (scopes) granted and when. We use it to count how many people add NotSoBot, and Our staff can see who added it to a server. Deleting your information removes this record.",
          "Purchases: premium entitlements and subscription status received from Discord.",
          "NotSoCredits: how many credits You and each server have spent this week, the ones You rolled over with Max, your bought credits, and a record of every pack bought, credits given to a server (who gave how many to which server) and credits taken back after a refund or chargeback. A server's members can see who gave it credits and how many, with the bot's credits command or on the dashboard.",
          "Website login: if You log in to notsobot.com with Discord, an OAuth2 access and refresh token with the \"identify\" scope (and the \"guilds\" scope if You let the website see your server list), and your login sessions with their browser user agent. With the \"guilds\" scope, your list of servers is fetched from Discord when the dashboard needs it. Without it, the dashboard lists the servers NotSoBot already sees You in, and your permissions in a server come from NotSoBot or Discord. Either way the list is cached for about a minute. If You open NotSoBot's Discord Activity, there's no Discord login: Discord adds a signed note to the Activity's requests to Us, with your user ID, the channel and server it's open in, and when the note expires, and We log You in from that note. We keep the note until it expires, and the login session is saved with your user agent, marked as a Discord Activity login. If You share from the Activity through Discord's own share options, Discord may first ask You to let the Activity use your account. That Discord token stays in the Activity and isn't stored by Us, except that sharing an edit uses it once to upload the file to Discord.",
          "Website and API request logs: the IP address, user agent, path, response status and response time of requests to the website's API, along with your user ID if You're logged in.",
          "Safety records: information about content flagged by Our automated safety systems, described in Section 6.",
        ]},
      ],
    },
    {
      title: "Section 3 - Information We Don't Collect",
      blocks: [
        {type: 'list', items: [
          "Messages that aren't directed at NotSoBot. NotSoBot only reads other messages when a command You run needs them, or where auto-embed is on (a server turned it on, or a member with premium turned it on for their own links), where a message whose only link is to a post on one of the sites picked is handled like the download command (the link is downloaded and posted, and the message's text isn't saved). Recent messages read to find an image or build a word cloud are only used to complete that command and are not saved. Messages You reply to with the ai command are stored as part of that AI request.",
          "The text of your command messages. Only the IDs listed above are kept.",
          "Your Discord password, email address or phone number.",
          "Payment details. Purchases are handled by Discord, and We never see your card or billing information.",
          "Copies of media flagged by Our safety systems, other than the flagged frames kept for review (Section 6).",
        ]},
      ],
    },
    {
      title: "Section 4 - How We Use Your Information",
      blocks: [
        {type: 'paragraph', text: "We use your information only to:"},
        {type: 'list', items: [
          "run the commands and features You use, and remember your settings and your server's settings",
          "log You in to the website and show the servers You can manage",
          "provide premium features You've purchased",
          "prevent spam, abuse and illegal content, and enforce Our Terms of Service",
          "review reports and respond to support requests",
          "find and fix bugs and keep the Service secure",
          "improve the Service using aggregated or de-identified data, such as total command counts",
          "meet legal obligations",
        ]},
        {type: 'paragraph', text: "If You're in the European Economic Area or United Kingdom, We rely on these legal bases: providing the Service You asked for (contract), keeping the Service secure and free of abuse (legitimate interests), and complying with the law (legal obligation)."},
      ],
    },
    {
      title: "Section 5 - What We Never Do",
      blocks: [
        {type: 'list', items: [
          "We never sell, rent or license your information, including in aggregated form.",
          "We don't share it with data brokers, advertising networks or any other monetization service.",
          "We don't show ads or use your information for marketing.",
          "We don't profile Discord users, track their relationships with other users, or use data to make decisions about anyone's eligibility for anything.",
          "We don't use Discord message content to train machine learning or AI models.",
          "We don't contact You outside of Discord, and We don't send You unsolicited messages on Discord.",
        ]},
      ],
    },
    {
      title: "Section 6 - Content Safety",
      blocks: [
        {type: 'paragraph', text: "Media and prompts processed by NotSoBot may be scanned by automated safety systems. If something is flagged, We keep a record containing the user, server, channel, message and command involved, the prompt, the URL the media came from, a cryptographic hash (SHA-256) and perceptual hash (PDQ) of the media, and the safety scores. We don't keep the media itself. So a flag can be reviewed, We keep up to 8 of its flagged frames as small images for up to 26 hours, or up to 7 days while it waits for Our team, and delete them once the flag is decided, unless the account is under a legal hold (Section 9). Frames are never kept for flags about child safety. Hashes can't be turned back into the original media, and We use them to block the same media if it's uploaded again."},
        {type: 'paragraph', text: "Flags may be reviewed by Our team, who may view the kept frames, or fetch the flagged media again from the URL it came from while reviewing. That copy is only shown to the reviewer and is not kept, though a report to NCMEC (below) can include it. Flags may also be reviewed first by an AI model, Anthropic's Claude: it's sent the kept frames (or the flagged media, fetched again from its URL the same way) or the flagged text, along with the command, the prompt and the safety scores, but not who, which server or which message it came from. Its decision, a short reason and Anthropic's ID for the request are kept with the flag. Only decisions it's highly confident in are applied without a person looking, the rest wait for Our team. Media flagged for child safety is never sent to it. Text flagged only for child safety is: it can dismiss a mistaken flag on a tag, a search or a reminder when it's highly confident, or mark any of them for Our team, but only Our team confirms one and decides whether it's reported. Mistaken flags are dismissed. Confirmed content may be reported to Discord, and to law enforcement or other authorities when the law requires it or when We believe it's needed to protect someone's safety. As US law requires, apparent child sexual abuse material is reported to the National Center for Missing & Exploited Children (NCMEC) through its CyberTipline, and NCMEC may pass the report to law enforcement. A report includes the account's Discord user ID, username and profile link, the IP addresses its website logins were used from in the last 90 days and when, the server's name and ID, the channel and message IDs, the command and prompt, the flag's hashes and safety scores, the kept frames, the image attached to the command (fetched again from Discord when the report is made), whether the account was blocked, and the AI review's decision with Anthropic's IDs for it. We keep a copy of the report We sent, without its files. Section 7 of Our Terms of Service has more detail."},
      ],
    },
    {
      title: "Section 7 - Who We Share Information With",
      blocks: [
        {type: 'paragraph', text: "We only share information with service providers that help run the Service and the others listed below, and only what each one needs for its job:"},
        {type: 'list', items: [
          "Discord, to run the bot, process purchases, and log You in to the website.",
          "AI providers, listed in Section 8, which receive the prompt and any media You give an AI command in order to generate your result.",
          "Search, information and media sources, such as Google, DuckDuckGo, Bing, Yandex, Wolfram Alpha, YouTube and Reddit, which receive the search terms, links or images You give a command that looks something up (a reverse image search sends Google the image).",
          "Google Cloud, for translation and reading text in images: commands that translate send Google the text, including what was said in your media when You ask for translated subtitles or a translated transcription, and commands that read or translate text in an image send Google the image. Publishing a template to the Template Hub sends Google its drawings, to read any text in them.",
          "ACRCloud, which identifies songs. Identifying a song in a file, or with the music listen command, sends it a fingerprint made from up to a minute of the audio, not the audio itself.",
          "Backblaze, which stores files You ask NotSoBot to host.",
          "Cloudflare, which hosts and protects the website. When You send a report from the website without logging in, Cloudflare Turnstile checks that You're not a bot. It receives your IP address and information about your browser to do this.",
          "Sentry, which receives error reports when something breaks. These can include the IDs and command details involved in the error.",
          "NCMEC, which receives the reports described in Section 6.",
        ]},
        {type: 'paragraph', text: "Each of these providers handles data under its own terms and privacy policy. We may also share information when the law requires it, for example to respond to a valid court order, or when We believe it's needed to protect someone's safety or to investigate a violation of Our Terms of Service. If NotSoBot is ever transferred to a new owner, your information would be transferred with it and would remain covered by this policy."},
        {type: 'paragraph', text: "Some information is visible to other people because of how the Service works. For example, tags You create and reminders You set in a server can be seen by members of that server, tags in the public directory can be seen by anyone, server administrators can see who added entries to their server's settings, and a server's moderators can see the warnings given there, including who gave them, and the reports members sent them, including who sent each one. Anyone who looks You up with the user info command can see your premium tier and whether You're NotSoBot staff, and a server's members can see who gave it premium server slots, their tier and when each slot was added."},
      ],
    },
    {
      title: "Section 8 - AI Providers",
      blocks: [
        {type: 'paragraph', text: "Nothing is sent to these companies unless someone uses an AI feature, or a safety flag is reviewed by AI (see Section 6). Data is only sent when:"},
        {type: 'list', items: [
          "You use the ai command. Your prompt and any media You attach are sent. If You use it as a reply, the messages You're replying to are sent too, up to 5 in a reply chain, including each author's name. If You reply to one of NotSoAI's answers to You, your earlier prompts in that conversation and what it answered are sent too, up to 4 of them. Where You asked is sent too: your display name and user ID, the server's name (or the group DM's), how You asked (a prefix, a mention, a reply, the slash command or one of NotSoAI's buttons) and the server's prefixes, whether You can manage the server or control its music, which voice channel You're in, and what NotSoBot's music is playing there (the track, who queued it and how many are queued). If You name NotSoBot commands, their help is sent too. Anything the server's admins told NotSoAI about the server is sent too. Unless You've turned memory off, the facts NotSoAI remembers about You are sent too (only the ones for that server and the ones that apply everywhere). They're never sent when a tag uses AI.",
          "You run a tag that uses AI. The tag's prompt is sent, which can include text and media You give the tag. The tag's creator chooses the model.",
          "You clone a voice, or use a cloned voice for text-to-speech.",
          "Something You sent is flagged by Our safety scanning. The flagged media or text, the command, the prompt and the safety scores are sent to Anthropic for review, as described in Section 6.",
        ]},
        {type: 'paragraph', text: "Apart from safety reviews, only the company that runs the chosen model receives it. The model is chosen in the command, in your settings, by your server's default, or by the tag's creator. These are the companies We currently use:"},
        {type: 'list', items: [
          "OpenAI, for GPT models",
          "Anthropic, for Claude models",
          "Google, for Gemini models",
          "xAI, for Grok models",
          "Meta, for Muse Spark models",
          "DeepSeek, for DeepSeek models",
          "Alibaba Cloud, for Qwen models",
          "MiniMax, for MiniMax models",
          "Moonshot AI, for Kimi models",
          "Xiaomi, for MiMo models",
          "Z.ai, for GLM models",
          "DeepInfra, which hosts openly available models from other developers, such as Gemma, Nemotron and gpt-oss",
          "fish.audio and ElevenLabs, for voices cloned before November 15, 2026, voices You choose to clone on or move to fish.audio, and text-to-speech with those voices",
        ]},
        {type: 'paragraph', text: "Image generation, audio transcription, image descriptions, object detection, scoring how toxic text is, safety scanning, voice cloning (since November 15, 2026, unless You pick fish.audio) and Our other text-to-speech voices run on Our own servers and are not sent to any of these companies. Only the review of something that was already flagged goes to Anthropic."},
        {type: 'paragraph', text: "Each company handles data under its own terms and privacy policy. Some of them are based outside the United States, including in China, and may process your data there. We'll update this list when We add or remove a provider."},
      ],
    },
    {
      title: "Section 9 - How Long We Keep Information",
      blocks: [
        {type: 'list', items: [
          "Links between your command messages and NotSoBot's replies are deleted after 14 days of inactivity.",
          "Website and API request logs keep the IP address and user agent for 90 days, then those two are removed. The rest of a log entry (the path, response status and response time) is kept, and the entries with your user ID are deleted when You delete your information. IP addresses included in a report to NCMEC are kept with Our copy of that report.",
          "Temporary files are deleted automatically when they expire.",
          "Media editor documents are deleted 14 days after their last edit (28 with premium). The copy of the file You opened expires with them, or stays in your uploaded files until it expires if You delete the document first. Files added as overlays or audio expire the same way, except that a file a template uses is kept for as long as the template uses it (up to 25 MB of files per template, 100 MB with premium) and expires 14 days after it stops. Preview copies are deleted after a day or two, and what NotSoBot noted about an Activity's launch after 6 hours. A room leaves its server's room list after 7 days without edits. Templates are kept until You delete them or delete your information, and so is the note that You used one. A published template's preview is kept while it's on the Template Hub or waiting for review. Invites last 24 hours, and a game room is deleted 10 minutes after everyone leaves it, or after an hour with no one playing. Game points and their awards are kept until You delete your information.",
          "Frames kept from flagged media are deleted once the flag is decided, and after 26 hours, or 7 days if the flag is waiting for Our team. Under a legal hold they may be kept until the hold ends, and then for up to 7 days.",
          "Transcriptions made for transcribing, sentence mixing and auto subtitles are kept for 24 hours under a hash of the audio, not linked to who asked, so running them again on the same media is faster.",
          "Songs queued from a link are converted and kept while they're in a server's music queue. They're deleted after they leave the queue, or once they're a week old if NotSoBot isn't playing music in that server.",
          "NotSoCredits' weekly spending is kept for 10 days. Bought credits and their records are kept so refunds and chargebacks can be handled, like other purchases.",
          "Records of your premium starting, renewing, changing and ending are kept when You delete your information, for the same reason.",
          "Music stats are kept until the server's data is deleted. Deleting your information removes the songs You queued from every server's stats.",
          "AI requests, including any messages You replied to, are deleted after 30 days.",
          "Cached server lists for the dashboard expire after about a minute.",
          "Tags, reminders, cloned voices, saved fonts and media editor templates are deleted when You delete them. Unpublishing a template only takes it off the Template Hub. Deleting a cloned voice also deletes it from the voice cloning service, along with the audio clips it was made from.",
          "A server's saved fonts are the server's, so they stay if the member who saved one leaves or deletes their information, and are deleted with the server's data. Saved fonts that lose their premium are kept, unused, until it's back.",
          "A server's own cloned voices are the server's too, so they stay if the member who cloned one leaves or deletes their information, and are deleted, along with their audio clips, with the server's data.",
          "AI memories are kept until You delete them, ask NotSoAI to forget them, or delete your information. Turning memory off stops NotSoAI from seeing or saving them but doesn't delete the ones already saved.",
          "Warnings are kept until a server's moderators remove them, or until the server's own expiry setting deletes them (they don't expire unless the server sets one). They're the server's records, so they stay if the warned member or the moderator leaves the server or deletes their Discord account, and deleting your information doesn't remove warnings a server gave You.",
          "Warnings from NotSoBot's staff are kept to prevent repeat abuse, like safety records. Deleting your information doesn't remove them, and a copy of your information includes them.",
          "Reports to a server's moderators, and the replies on them, are kept until the server's data is deleted, except the reported member's image and a reported message's text and image, which are deleted 30 days after the report. Like warnings, they're the server's records, so they stay if the member who sent one or the reported member leaves the server or deletes their Discord account, and deleting your information doesn't remove them.",
          "Server settings are kept if NotSoBot is removed from a server, so they still apply if it's added back. A server owner can ask Us to delete them.",
          "Safety records, including Our copies of reports to NCMEC, are kept to prevent repeat abuse, and for as long as the law requires for anything We report.",
          "If Our team places a legal hold on an account, for example while We report it to the authorities or respond to a legal request, its information is kept past the times above, including its AI requests, the links between its commands and NotSoBot's replies, its temporary files and media editor documents, and any frames kept from its flagged media, and none of it can be deleted until the hold is lifted. While the hold lasts, We also keep a copy of anything of the account's that's changed or deleted, whether by its owner or by someone else like a server's moderators: its tags (with their files, variables and stored data), AI memories, cloned voices and their audio, saved fonts, reminders and media editor documents. Tag variables and media editor documents change often, so We copy all of them when the hold starts and then at most once an hour each. These copies are kept after the hold ends for as long as the reason for the hold needs them, or the law requires. We may not tell You when this happens.",
          "Other information is kept while You use the Service, and deleted when You ask Us to delete it or when We no longer need it.",
        ]},
      ],
    },
    {
      title: "Section 10 - Your Choices and Rights",
      blocks: [
        {type: 'paragraph', text: "You can ask Us for a copy of your information, to correct it, or to delete it, by using /bot report (or the bot report command) or emailing privacy@notsocompany.com. We may ask You to confirm that You own the Discord account involved. We'll respond within 30 days. Some information may be kept where We need it for legal reasons, to deal with abuse, or for safety records. While an account is under a legal hold, Delete my data is turned off and We won't delete its information until the hold ends. Deleting your information removes your tags, reminders, cloned voices, saved fonts, settings and the other information that's only yours. Your purchases and premium are kept, and so are reports You sent Us and the records servers keep that mention You, like warnings and reports to their moderators."},
        {type: 'paragraph', text: "You can also:"},
        {type: 'list', items: [
          "delete your information yourself with Delete my data in the website dashboard's settings",
          "delete your own tags, reminders, cloned voices and saved fonts with NotSoBot's commands or on the website's dashboard, and your media editor templates in the editor",
          "see, edit or delete what NotSoAI remembers about You, or turn its memory off, with the /settings ai-memory commands or on the website's dashboard",
          "remove NotSoBot from a server You manage, or remove the user-installed app from your account",
          "revoke the website's access to your Discord account in Discord's settings under Authorized Apps",
          "clear the website's saved login by logging out or clearing your browser's site data",
        ]},
        {type: 'paragraph', text: "Depending on where You live, for example in the European Economic Area, United Kingdom or California, You may have further rights, such as objecting to how We use your information or complaining to your local data protection authority. We will not treat You differently for using any of these rights."},
      ],
    },
    {
      title: "Section 11 - Cookies and Browser Storage",
      blocks: [
        {type: 'paragraph', text: "The website doesn't use advertising or analytics cookies. It uses your browser's local storage to keep You logged in and to remember display preferences. Cloudflare may set cookies that are needed to protect the website from attacks."},
        {type: 'paragraph', text: "The website and nsb.gg count visits with Umami, an analytics tool We host Ourselves at oasis.notsocompany.com. It doesn't use cookies or keep your IP address, and it isn't linked to your Discord account. NotSoCompany's privacy policy at notsocompany.com/privacy lists what it records."},
      ],
    },
    {
      title: "Section 12 - Security",
      blocks: [
        {type: 'paragraph', text: "Information is sent over encrypted connections, and access to Our systems is limited to the people who need it to run the Service. No system is completely secure, though. If We learn that information from the Service was accessed without authorization, We'll notify Discord and affected users as required by the Discord Developer Terms of Service and applicable law."},
      ],
    },
    {
      title: "Section 13 - Age Requirement",
      blocks: [
        {type: 'paragraph', text: "The Service is only for people who are 18 or older. We don't knowingly collect information from anyone under 18. If We learn that someone under 18 is using the Service, We'll block their access and delete their information, except where We must keep it under Section 6."},
      ],
    },
    {
      title: "Section 14 - International Users",
      blocks: [
        {type: 'paragraph', text: "We're based in the United States, and your information is stored and processed in the United States and in other countries where Our service providers operate. Those countries may have different data protection laws from the country You live in."},
      ],
    },
    {
      title: "Section 15 - Changes to This Policy",
      blocks: [
        {type: 'paragraph', text: "We'll update this policy when Our practices change, and the date at the top will show when it was last changed. For significant changes, We'll also post a notice in NotSoBot's support server or on the website."},
      ],
    },
    {
      title: "Section 16 - Contact Us",
      blocks: [
        {type: 'paragraph', text: "Questions about this policy and data requests can be sent to privacy@notsocompany.com, or through /bot report (or the bot report command)."},
      ],
    },
  ],
};
