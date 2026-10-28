import type { LegalDocument } from './legal';

export const PRIVACY_POLICY: LegalDocument = {
  title: "Privacy Policy",
  effective: "October 13, 2026",
  lastUpdated: "October 28, 2026",
  intro: "This Privacy Policy explains what information NotSoBot collects, why, who it's shared with, how long it's kept, and how You can get a copy of it or have it deleted.",
  sections: [
    {
      title: "Section 1 - Who We Are",
      blocks: [
        {type: 'paragraph', text: "NotSoBot is operated by NotSoCompany, 254 Chapman Rd, Ste 208 #8692 Newark, Delaware 19702 (\"We\", \"Us\" or \"Our\"). This policy covers the NotSoBot Discord application, the website at notsobot.com, and the NotSoBot API (together, the \"Service\"). Words that are capitalized and not defined here have the meaning given in Our Terms of Service."},
        {type: 'paragraph', text: "Discord's own privacy policy covers how Discord handles your data. This policy only covers what NotSoBot does."},
      ],
    },
    {
      title: "Section 2 - Information We Collect",
      blocks: [
        {type: 'paragraph', text: "We only collect what's needed to run the features You use, keep the Service secure, and prevent abuse. Depending on which features You use, this includes:"},
        {type: 'list', items: [
          "Discord account information: your user ID, username, discriminator, avatar, account flags, and the ID of your DM channel with NotSoBot. This comes from Discord when You use a command. Your profile's banner color is also saved when You log in to the dashboard, to show on your dashboard profile.",
          "Your settings: language, timezone, units, response display preferences, file upload preferences, selected AI models and personality, text-to-speech voice, and the servers You pinned on the website's dashboard.",
          "Server information and settings for servers NotSoBot is in: server ID, name, icon, features, language, timezone, custom prefixes, AI settings, what the server's admins told NotSoAI about the server along with who added each one, and the rules for who can use which commands along with who added each rule.",
          "Warnings a server's moderators give with the warn command: the server, the warned member's user ID, the moderator's user ID, the reason and when it was given. The warned member is sent the warning in a DM.",
          "Reports members send to a server's moderators with /report, the report command or Report to Mods: the server, who sent it, who was reported, the reason, when it was sent, its status and the moderator who last resolved or dismissed it. A report of a member also keeps an image of them from when it was sent (their avatar, nickname and username), and a report of a message keeps the message's channel and message IDs, its text and an image of the message (showing its author's name and avatar, its text, and its images and embed), so moderators can still see them if they change or the message is deleted. If an image may contain NSFW content, it's kept with every picture in it (avatars, attachments, embeds and emojis) replaced by a plain block. The text and images are deleted 30 days after the report. Replies between the member who sent it and the moderators are kept with the report too (what was written, who wrote it and when), along with each time it was resolved, dismissed or reopened. The member gets the moderators' replies in a DM from \"the moderators\", without the moderator's name.",
          "Logging settings: if a server enables logging, the channel and webhook used to post logs, including the webhook token. Log events are sent to that webhook and are not kept by Us.",
          "Command replies: the IDs of your command message, its channel, the command used, and NotSoBot's reply, so that editing or deleting your command can update or remove the reply.",
          "Command usage statistics: which command was used, when, and the server, channel and user IDs involved.",
          "Tags: names, content, variables, attached media, usage counts and directory listings for tags You create, and each time a tag is used (the tag, who used it, the server and when).",
          "Music stats: each song that plays in a server (its title, artist and link), who queued it, how long it played and when, so the server can see what it played the most.",
          "Reminders: reminder text, times, and the channel and message they belong to.",
          "Reports You send to Us with /bot report (or the bot report command), Report to NotSoBot, or from the website, including the text, the server, channel and message IDs involved, and Our review notes. Bug and tag reports sent from the website without logging in aren't linked to any account. Instead We keep a one-way hash of the IP address they came from, to limit how many can be sent and to spot abuse. The IP address itself isn't stored with the report.",
          "Uploaded files: files You ask NotSoBot to host, their file names, sizes, dimensions and a file hash (BLAKE2b).",
          "AI requests: the prompt, including any messages You replied to with the ai command, along with the model, generated response, any error and token counts.",
          "AI memory: short facts NotSoAI saves about You when You ask it to remember something, whether each one applies everywhere or only in one server, when it was saved, and whether You've turned memory off.",
          "Cloned voices: the voice's name, the ID of the voice stored at the voice cloning service (fish.audio, or ElevenLabs for older voices), and the audio clips You cloned it from.",
          "Purchases: premium entitlements and subscription status received from Discord.",
          "Website login: if You log in to notsobot.com with Discord, an OAuth2 access and refresh token with the \"identify\" and \"guilds\" scopes, and your login sessions with their browser user agent. Your list of servers is fetched from Discord when the dashboard needs it and cached for about a minute.",
          "Website and API request logs: the IP address, user agent, path, response status and response time of requests to the website's API, along with your user ID if You're logged in.",
          "Safety records: information about content flagged by Our automated safety systems, described in Section 6.",
        ]},
      ],
    },
    {
      title: "Section 3 - Information We Don't Collect",
      blocks: [
        {type: 'list', items: [
          "Messages that aren't directed at NotSoBot. NotSoBot only reads other messages when a command You run needs them. Recent messages read to find an image or build a word cloud are only used to complete that command and are not saved. Messages You reply to with the ai command are stored as part of that AI request.",
          "The text of your command messages. Only the IDs listed above are kept.",
          "Your Discord password, email address or phone number.",
          "Payment details. Purchases are handled by Discord, and We never see your card or billing information.",
          "Copies of media flagged by Our safety systems.",
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
        {type: 'paragraph', text: "Media and prompts processed by NotSoBot may be scanned by automated safety systems. If something is flagged, We keep a record containing the user, server, channel, message and command involved, the prompt, the URL the media came from, a cryptographic hash (SHA-256) and perceptual hash (PDQ) of the media, and the safety scores. We do not keep a copy of the media. Hashes can't be turned back into the original media, and We use them to block the same media if it's uploaded again."},
        {type: 'paragraph', text: "Flags may be reviewed by Our team, who may view the flagged media by fetching it again from the URL it came from while reviewing. That copy is only shown to the reviewer and is not kept. Flags may also be reviewed first by an AI model, Anthropic's Claude: it's sent the flagged media (fetched again from its URL the same way) or the flagged text, along with the command, the prompt and the safety scores, but not who, which server or which message it came from. Its decision and a short reason are kept with the flag. Only decisions it's highly confident in are applied without a person looking, the rest wait for Our team. Flags about child safety are never sent to it, only Our team reviews those. Mistaken flags are dismissed. Confirmed content may be reported to Discord, and to law enforcement or other authorities when the law requires it or when We believe it's needed to protect someone's safety. Section 7 of Our Terms of Service has more detail."},
      ],
    },
    {
      title: "Section 7 - Who We Share Information With",
      blocks: [
        {type: 'paragraph', text: "We only share information with service providers that help run the Service, and only what each one needs for its job:"},
        {type: 'list', items: [
          "Discord, to run the bot, process purchases, and log You in to the website.",
          "AI providers, listed in Section 8, which receive the prompt and any media You give an AI command in order to generate your result.",
          "Search, information and media sources, such as Google, DuckDuckGo, Bing, Yandex, Wolfram Alpha, YouTube and Reddit, which receive the search terms, links or images You give a command that looks something up (a reverse image search sends Google the image).",
          "Backblaze, which stores files You ask NotSoBot to host.",
          "Cloudflare, which hosts and protects the website. When You send a report from the website without logging in, Cloudflare Turnstile checks that You're not a bot. It receives your IP address and information about your browser to do this.",
          "Sentry, which receives error reports when something breaks. These can include the IDs and command details involved in the error.",
        ]},
        {type: 'paragraph', text: "Each of these providers handles data under its own terms and privacy policy. We may also share information when the law requires it, for example to respond to a valid court order, or when We believe it's needed to protect someone's safety or to investigate a violation of Our Terms of Service. If NotSoBot is ever transferred to a new owner, your information would be transferred with it and would remain covered by this policy."},
        {type: 'paragraph', text: "Some information is visible to other people because of how the Service works. For example, tags You create and reminders You set in a server can be seen by members of that server, tags in the public directory can be seen by anyone, server administrators can see who added entries to their server's settings, and a server's moderators can see the warnings given there, including who gave them, and the reports members sent them, including who sent each one."},
      ],
    },
    {
      title: "Section 8 - AI Providers",
      blocks: [
        {type: 'paragraph', text: "Nothing is sent to these companies unless someone uses an AI feature, or a safety flag is reviewed by AI (see Section 6). Data is only sent when:"},
        {type: 'list', items: [
          "You use the ai command. Your prompt and any media You attach are sent. If You use it as a reply, the messages You're replying to are sent too, up to 5 in a reply chain, including each author's name. If You reply to one of NotSoAI's answers to You, your earlier prompts in that conversation and what it answered are sent too, up to 4 of them. Anything the server's admins told NotSoAI about the server is sent too. Unless You've turned memory off, the facts NotSoAI remembers about You are sent too (only the ones for that server and the ones that apply everywhere). They're never sent when a tag uses AI.",
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
          "fish.audio and ElevenLabs, for voice cloning and text-to-speech with cloned voices",
        ]},
        {type: 'paragraph', text: "Image generation, audio transcription, image descriptions, object detection, scoring how toxic text is, safety scanning and Our other text-to-speech voices run on Our own servers and are not sent to any of these companies. Only the review of something that was already flagged goes to Anthropic."},
        {type: 'paragraph', text: "Each company handles data under its own terms and privacy policy. Some of them are based outside the United States, including in China, and may process your data there. We'll update this list when We add or remove a provider."},
      ],
    },
    {
      title: "Section 9 - How Long We Keep Information",
      blocks: [
        {type: 'list', items: [
          "Links between your command messages and NotSoBot's replies are deleted after 14 days of inactivity.",
          "Temporary files are deleted automatically when they expire.",
          "Songs queued from a link are converted and kept while they're in a server's music queue. They're deleted after they leave the queue, or once they're a week old if NotSoBot isn't playing music in that server.",
          "Music stats are kept until the server's data is deleted. Deleting your information removes the songs You queued from every server's stats.",
          "AI requests, including any messages You replied to, are deleted after 30 days.",
          "Cached server lists for the dashboard expire after about a minute.",
          "Tags, reminders and cloned voices are deleted when You delete them. Deleting a cloned voice also deletes it from the voice cloning service, along with the audio clips it was made from.",
          "AI memories are kept until You delete them, ask NotSoAI to forget them, or delete your information. Turning memory off stops NotSoAI from seeing or saving them but doesn't delete the ones already saved.",
          "Warnings are kept until a server's moderators remove them, or until the server's own expiry setting deletes them (they don't expire unless the server sets one). They're the server's records, so they stay if the warned member or the moderator leaves the server or deletes their Discord account, and deleting your information doesn't remove warnings a server gave You.",
          "Reports to a server's moderators, and the replies on them, are kept until the server's data is deleted, except the reported member's image and a reported message's text and image, which are deleted 30 days after the report. Like warnings, they're the server's records, so they stay if the member who sent one or the reported member leaves the server or deletes their Discord account, and deleting your information doesn't remove them.",
          "Server settings are kept if NotSoBot is removed from a server, so they still apply if it's added back. A server owner can ask Us to delete them.",
          "Safety records are kept to prevent repeat abuse, and for as long as the law requires for anything We report.",
          "Other information is kept while You use the Service, and deleted when You ask Us to delete it or when We no longer need it.",
        ]},
      ],
    },
    {
      title: "Section 10 - Your Choices and Rights",
      blocks: [
        {type: 'paragraph', text: "You can ask Us for a copy of your information, to correct it, or to delete it, by using /bot report (or the bot report command) or emailing privacy@notsocompany.com. We may ask You to confirm that You own the Discord account involved. We'll respond within 30 days. Some information may be kept where We need it for legal reasons, to deal with abuse, or for safety records. Deleting your information removes your tags, reminders, cloned voices, settings and the other information that's only yours. Your purchases and premium are kept, and so are reports You sent Us and the records servers keep that mention You, like warnings and reports to their moderators."},
        {type: 'paragraph', text: "You can also:"},
        {type: 'list', items: [
          "delete your information yourself with Delete my data in the website dashboard's settings",
          "delete your own tags, reminders and cloned voices with NotSoBot's commands or on the website's dashboard",
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
