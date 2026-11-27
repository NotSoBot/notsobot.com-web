// The English guides, the source the other languages follow (es.ts, pt.ts, same section ids). Facts here are checked
// against the code as of 2026-11-26, keep them in step when a rule changes:
// - Flag Guesser in the Activity: notsobot.api `utilities/tools/activity_games/flag.py` (points, hints, settings,
//   rooms and their limits) and `countries.py` (difficulty tiers, typo matching)
// - Flag Guesser in chat: notsobot.ts `src/utils/formatter/commands/game.flag.ts`
// - Letter Trail: notsobot.api `utilities/tools/activity_games/letter_trail.py` (scoring, boards, settings) and
//   word-game-plan.md's "Build contract" (written before the api was, check it once it lands)
// - game points: notsobot.api `utilities/tools/game_points.py` (the daily cap, weeks), notsobot.ts `/games points` and
//   `/games leaderboard`
// - the editor: notsobot.api `utilities/tools/editor/` (rooms, templates, hub) and the editor's own strings

import type { GuideBook } from './types';


export const GUIDES_ENGLISH: GuideBook = {
  opening: {
    id: 'opening',
    title: 'Opening the Activity',
    blocks: [
      {kind: 'text', text: 'NotSoBot’s Discord Activity has the media editor and the games. It opens right inside a channel, and everyone there can join.'},
      {kind: 'list', items: [
        'Use `/games play` to go straight to the games, or `/editor` for the media editor.',
        'Or press **Launch** on NotSoBot in Discord’s app launcher, then pick **Edit media** or **Games**.',
        'Someone already in it? Press **Join** on the message NotSoBot posts in the channel.',
      ]},
      {kind: 'tip', text: 'Each game and the media editor has a question mark button that opens its guide right in the Activity.'},
    ],
  },

  guides: {
    'flag-guesser': {
      title: 'Flag Guesser',
      summary: 'Name the country behind each flag before time runs out, together in the Activity or in chat.',
      quick: [
        'Everyone gets the same flag. Name the country before time runs out.',
        'Play in a room with others, or press **Play solo** for a game just for you.',
        'A flag is worth 3 points, 2 after the first hint and 1 after the second.',
        'The first to get it gets +1, and 3 or more in a row adds +1 more.',
        'Typing: guess as often as you like. Four choices: one try per flag.',
        'Small typos still count, and a close guess tells you to check the spelling.',
        'Your score goes to your [game points](guide:game-points) when the game ends.',
      ],
      sections: [
        {
          id: 'starting',
          title: 'Starting a game',
          blocks: [
            {kind: 'text', text: 'Flag Guesser is played in rooms in NotSoBot’s Discord Activity. There’s also a quicker version in chat, one flag at a time.'},
            {kind: 'steps', items: [
              'Use `/games play` in a channel, or press **Launch** on NotSoBot in Discord’s app launcher and pick **Games**.',
              'On the Games tab, pick **Flag Guesser**.',
              'Press **Play** or **Watch** on a room, use **Quick play**, make your own with **New room**, or press **Play solo** to play alone.',
              'Wait in the lobby for others, then the host presses **Start game**. A 3-second countdown (3, 2, 1) comes before the first flag, and nothing can be answered until it ends.',
            ]},
            {kind: 'text', text: 'Alone in your lobby? It offers **Invite friends**: share a link or post an invite in the channel. Or just start, a game works with one player.'},
            {kind: 'text', text: 'NotSoBot usually posts a message in the channel too, with a **Join** button, so others can jump in.'},
            {kind: 'tip', text: 'Playing `/games flag-guesser` in chat? Its **Open in Activity** button opens a room that carries on the same game: the flag that was up comes first, with the same difficulty, typed answers and a minute a flag. Scores start from zero.'},
          ],
        },
        {
          id: 'solo',
          title: 'Playing solo',
          blocks: [
            {kind: 'text', text: '**Play solo** in the room list starts a game just for you. Nobody else sees the room or can come in.'},
            {kind: 'list', items: [
              'It starts right away, with the settings you last played alone with on this device. The first time, it uses the default settings.',
              'There’s no countdown: the first flag shows as soon as the room opens.',
              'At the end, **Play again** starts another game with the same settings. **Change settings** takes you to the lobby to change them first.',
              'A solo game has no watchers, invites or room settings. Starting a new one closes the last one.',
              'Your points count toward your total like any other game.',
            ]},
          ],
        },
        {
          id: 'rooms',
          title: 'Rooms',
          blocks: [
            {kind: 'text', text: 'Every game is played in a room. The room list has two tabs, each showing how many rooms it has:'},
            {kind: 'list', items: [
              '**This server**: rooms made in your server, the same in every channel’s Activity. In a DM, the rooms made in that DM.',
              '**Global**: rooms listed in every server’s Activity. People from other servers see your Discord name and avatar, and you see theirs.',
            ]},
            {kind: 'text', text: 'Search rooms by name, pick a game, and sort them by **Filling up**, **Playing now** or **Newest**.'},
            {kind: 'text', text: '**Quick play** joins the lobby with the most players in the tab you’re on. It skips rooms with a password, watch-only rooms, rooms you were removed from and solo games. When there’s none, it makes a new room for you.'},
            {kind: 'text', text: 'When you make a room with **New room**, you pick:'},
            {kind: 'list', items: [
              'A name. Leave it empty and it’s called after you.',
              '**Who can find it**: **This server** or **Global**. It starts on the tab you’re on. The creator can switch it later in **Room settings**, but only while the room is waiting to start.',
              '**Everyone** or **Password**. With a password, only people who know it can play or watch.',
              '**Watch-only**: anyone who joins from then on only watches. You and whoever’s already playing keep playing.',
            ]},
            {kind: 'tip', text: 'You can have 2 rooms open in a server and 1 global room at a time, and a server has room for 20. Solo games don’t count. A room goes away about 10 minutes after everyone has left.'},
          ],
        },
        {
          id: 'host',
          title: 'The host and the creator',
          blocks: [
            {kind: 'list', items: [
              'The **host** picks the settings, starts the game and can end it early. The room’s creator hosts while they’re playing. Otherwise it’s the first person in, and it passes on when the host leaves.',
              'The **creator** can rename the room, change its password, turn watch-only on or off, remove people and close the room.',
              'In a server room, the server’s moderators can remove people and close it too. Global rooms are moderated by their creator and NotSoBot staff, not by server moderators.',
              'Someone who was removed can’t come back into that room. Closing a room ends its game and sends everyone back to the room list.',
            ]},
            {kind: 'tip', text: 'Ending a game early takes everyone back to the lobby. The points people scored so far still go to their totals.'},
          ],
        },
        {
          id: 'settings',
          title: 'Settings',
          blocks: [
            {kind: 'text', text: 'Only the host changes these, before a game starts or after one ends.'},
            {kind: 'facts', items: [
              {label: 'Answer by', value: '**Typing** (the default): type the country’s name. **Four choices**: pick one of four names, one try per flag.'},
              {label: 'Difficulty', value: '**Easy**: flags most people know. **Medium** (the default): most of the world’s countries. **Hard**: every country, plus territories that fly their own flag.'},
              {label: 'Flags', value: '5 to 20 a game, 10 by default.'},
              {label: 'Seconds each', value: '10 to 60 a flag, 20 by default.'},
            ]},
            {kind: 'tip', text: 'With four choices, the wrong answers usually come from the same part of the world, so they look alike.'},
          ],
        },
        {
          id: 'scoring',
          title: 'Scoring',
          blocks: [
            {kind: 'facts', items: [
              {label: 'Before any hint', value: '3 points'},
              {label: 'After the region hint', value: '2 points'},
              {label: 'After the letters hint', value: '1 point'},
              {label: 'First one to get it', value: '+1'},
              {label: '3 or more in a row', value: '+1 for each flag'},
            ]},
            {kind: 'text', text: 'A streak counts the flags you get one after another. Miss one and it starts over.'},
            {kind: 'text', text: 'A flag ends early once everyone playing has answered. Then the answer shows for a few seconds, with who got it. After the last flag come the final scores, and how many points your game added to your total.'},
          ],
        },
        {
          id: 'hints',
          title: 'Hints and close guesses',
          blocks: [
            {kind: 'list', items: [
              'A third of the way through the time, the **region** shows, like Europe or South America.',
              'Two thirds of the way through, the **letters** show: the first letter of each word and how long it is, like `F _ _ _ _ _`.',
              'Each hint takes a point off what the flag is worth.',
            ]},
            {kind: 'text', text: 'When typing, small typos still count. A guess that’s just a bit further off says it’s close, so check the spelling. A typo that’s as close to another country doesn’t count. Wrong guesses cost nothing.'},
            {kind: 'text', text: 'Country names in English, Spanish and Portuguese all count, whatever language you play in.'},
          ],
        },
        {
          id: 'watching',
          title: 'Watching',
          blocks: [
            {kind: 'list', items: [
              'Watchers see the whole game live, but don’t answer. Press **Watch** on a room, or **Watch instead** between games.',
              'A watcher can press **Join in** to play from the next flag, unless the room is watch-only.',
              'Watchers aren’t waited on, so a flag still ends early once every player has answered.',
            ]},
          ],
        },
        {
          id: 'invites',
          title: 'Invites',
          blocks: [
            {kind: 'text', text: 'Anyone in a room can press **Invite**. **Share link** sends it through Discord, and **Post in this channel** posts it with a Join button. The invite opens the Activity straight into the room.'},
            {kind: 'list', items: [
              'It gets people into a password room without the password.',
              'People removed from the room stay out.',
              'It lasts 24 hours. A global room’s invite works from any server, a server room’s only in that server.',
            ]},
          ],
        },
        {
          id: 'chat',
          title: 'Flag Guesser in chat',
          blocks: [
            {kind: 'text', text: 'Use `/games flag-guesser` in a channel, with a difficulty if you like (Easy by default).'},
            {kind: 'list', items: [
              'One flag per message. Name it in chat, or press **Guess** and type it in the box.',
              'You have 60 seconds, in three steps of 20: the region shows after 20 seconds and the letters after 40.',
              'It’s worth 3 points, then 2, then 1. The same person getting 3 or more in a row gets +1 each time. Someone else getting one, a skip or running out of time starts the streak over.',
              'One flag runs in a channel at a time. Whoever started it can press **Skip**.',
              'When it’s done, anyone can press **Play Again** for the next flag, for 15 minutes. Scores carry on through Play Again.',
              'Each flag you name adds its points to your total right away.',
            ]},
            {kind: 'tip', text: 'Want rounds with friends instead? **Open in Activity** takes the game into a room.'},
          ],
        },
      ],
    },

    'letter-trail': {
      title: 'Letter Trail',
      summary: 'Spell words through touching letters on a grid everyone plays at once. Words nobody else finds get extra points.',
      quick: [
        'Everyone in the room plays the same grid of letters at the same time.',
        'Drag through letters that touch, diagonals too, to spell a word. Each tile once per word.',
        'Words need 3 letters at least. Longer words score a lot more.',
        'One tile is marked ×2: a word through it counts double.',
        'A word nobody else in the room found gets 2 more points at the end of the round.',
        'You see how many words everyone has, never which ones.',
        'Your score goes to your [game points](guide:game-points) when the game ends, a quarter of it rounded up.',
      ],
      sections: [
        {
          id: 'starting',
          title: 'Starting a game',
          blocks: [
            {kind: 'text', text: 'Letter Trail is played in rooms in NotSoBot’s Discord Activity, like [Flag Guesser](guide:flag-guesser).'},
            {kind: 'steps', items: [
              'Use `/games play` in a channel, or press **Launch** on NotSoBot in Discord’s app launcher and pick **Games**.',
              'On the Games tab, pick **Letter Trail**.',
              'Press **Play** or **Watch** on a room, use **Quick play**, make your own with **New room**, or press **Play solo** to play alone.',
              'Wait in the lobby for others, then the host presses **Start game**. With more than one player, a 3-second countdown comes first and the letters show when it ends.',
            ]},
            {kind: 'text', text: 'Words are English for now, whatever language you use the Activity in.'},
          ],
        },
        {
          id: 'playing',
          title: 'Spelling words',
          blocks: [
            {kind: 'list', items: [
              '**Drag:** put your finger (or mouse) on the first letter and slide through the rest. Letting go sends the word. Slide back onto the letter before to undo a step.',
              '**Tap:** tap letters one by one, each touching the last. Tap the last letter again, or press **Send**, to send it. Tap anywhere off the grid to start over.',
              '**Keyboard:** type a word and the grid lights a way to spell it, if there is one. **Enter** sends it, **Backspace** takes a letter off and **Esc** clears it.',
            ]},
            {kind: 'text', text: 'Letters touch side by side and corner to corner. Each tile can only be used once in a word. The **Qu** tile is two letters, Q and U together.'},
            {kind: 'text', text: 'A word that counts flashes green and goes to your list, newest first. A word that doesn’t shakes and says why: too short, not in the word list, letters that don’t touch, or one you already have. Wrong words cost nothing.'},
            {kind: 'tip', text: 'While a round runs, everyone sees how many words each player has, but never which ones. Those show at the end of the round.'},
          ],
        },
        {
          id: 'scoring',
          title: 'Scoring',
          blocks: [
            {kind: 'facts', items: [
              {label: '3 letters', value: '1 point'},
              {label: '4 letters', value: '2 points'},
              {label: '5 letters', value: '4 points'},
              {label: '6 letters', value: '6 points'},
              {label: '7 letters', value: '9 points'},
              {label: '8 letters or more', value: '12 points'},
            ]},
            {kind: 'text', text: 'Your score for a round is all your words added up, with the ×2 tile and the only you points below. Your game score is your rounds added up.'},
          ],
        },
        {
          id: 'only-you',
          title: 'Only you',
          blocks: [
            {kind: 'text', text: 'When a round ends, every word that only you found in the room gets **2 more points**. A word someone else found too counts normally. So the word nobody else spotted is worth hunting for, even a short one.'},
            {kind: 'text', text: 'The end of the round shows everyone’s words side by side, with the **only you** ones marked, plus the longest words on the board that nobody found. Tap a word to see where it was on the grid.'},
            {kind: 'tip', text: 'In a solo game there’s nobody to beat to a word, so there are no only you points.'},
          ],
        },
        {
          id: 'bonus',
          title: 'The ×2 tile',
          blocks: [
            {kind: 'text', text: 'Every board has one tile marked **×2**. Any word that goes through it counts double, and your list marks it with ×2. It’s never the Qu tile.'},
            {kind: 'text', text: 'The tile doubles the word first, then the 2 only you points are added. A 5-letter word through the ×2 tile that only you found is 4 × 2 + 2 = 10 points.'},
          ],
        },
        {
          id: 'settings',
          title: 'Settings',
          blocks: [
            {kind: 'text', text: 'Only the host changes these, before a game starts or after one ends.'},
            {kind: 'facts', items: [
              {label: 'Grid', value: '**4×4** (the default) or **5×5**. A bigger grid has more words, and longer ones.'},
              {label: 'Time a round', value: '60, 80 (the default) or 120 seconds.'},
              {label: 'Rounds', value: '1 to 5 a game, 1 by default.'},
            ]},
            {kind: 'text', text: 'Boards are picked to have plenty of words: usually 30 or more on a 4×4 and 60 or more on a 5×5.'},
            {kind: 'text', text: 'After a round, its words show for 10 seconds before the next one. The host can press **Next round** to go on sooner.'},
          ],
        },
        {
          id: 'solo',
          title: 'Playing solo',
          blocks: [
            {kind: 'text', text: '**Play solo** in the room list starts a game just for you. Nobody else sees the room or can come in.'},
            {kind: 'list', items: [
              'It starts right away, with no countdown, and with the settings you last played Letter Trail alone with on this device.',
              'At the end, **Play again** starts another game with the same settings. **Change settings** takes you to the lobby first.',
              'Your points count toward your total like any other game.',
            ]},
          ],
        },
        {
          id: 'rooms',
          title: 'Rooms, watching and points',
          blocks: [
            {kind: 'text', text: 'Rooms work the same as Flag Guesser’s: this server’s or global ones, a password or watch-only, the host and the creator, removing people and invites. See [Flag Guesser’s rooms](guide:flag-guesser#rooms) for the details.'},
            {kind: 'list', items: [
              'Watchers see the grid and everyone’s word counts live, and every player’s words at the end of each round.',
              'When the game ends, a quarter of your score (rounded up) goes to your [game points](guide:game-points): a game of 50 adds 13. Each game counts up to 300 points a day.',
            ]},
          ],
        },
      ],
    },

    'game-points': {
      title: 'Game points',
      summary: 'One points total for every NotSoBot game, with server and global leaderboards.',
      quick: [
        'Points from every NotSoBot game add up to one total.',
        'Flag Guesser’s count one for one: a flag worth 3 adds 3. Letter Trail adds a quarter of its score, rounded up.',
        'Each game counts up to 300 points a day.',
        'In chat they count when you answer, in the Activity when the game ends.',
        '`/games points` shows your total, `/games leaderboard` the top players.',
      ],
      sections: [
        {
          id: 'earning',
          title: 'Earning points',
          blocks: [
            {kind: 'text', text: 'Every game adds to the same total. [Flag Guesser](guide:flag-guesser)’s points count one for one. [Letter Trail](guide:letter-trail) scores run higher for the same time played, so a quarter of its score counts, rounded up: a game of 50 adds 13.'},
            {kind: 'list', items: [
              '**In chat:** each flag you name in `/games flag-guesser` counts right away.',
              '**In the Activity:** your score counts when the game ends, after the last flag or round, or when the host ends it early. Everyone with points gets them, even someone removed partway through.',
              'Points from a server count toward that server’s board. Points from a global room or a DM only count toward the global board.',
            ]},
            {kind: 'tip', text: 'A game’s final scores in the Activity say how many points it added to your total.'},
          ],
        },
        {
          id: 'daily-limit',
          title: 'The daily limit',
          blocks: [
            {kind: 'text', text: 'Each game counts up to 300 points per person a day. The day starts at midnight UTC. Past the limit, the rest isn’t counted. In the Activity, the final scores say when the daily limit was reached.'},
            {kind: 'text', text: 'That’s about 100 flags at full points, or Letter Trail games adding up to a score of 1,200: plenty to play a lot, while keeping the boards fair.'},
          ],
        },
        {
          id: 'commands',
          title: 'Checking points in chat',
          blocks: [
            {kind: 'facts', items: [
              {label: '`/games points`', value: 'Someone’s total, their points per game, this week’s points, and their rank in the server and worldwide. Leave out the user to see your own.'},
              {label: '`/games leaderboard`', value: 'The top 10. Pick **where**: Server (the default) or Global, and the **period**: All time (the default) or This week. Your own place shows under it when you’re not in the top 10.'},
            ]},
            {kind: 'text', text: 'In a DM, the server board shows the global one instead. Weeks start on Monday at midnight UTC.'},
          ],
        },
        {
          id: 'activity',
          title: 'Points in the Activity',
          blocks: [
            {kind: 'list', items: [
              '**Your points** sits at the top of the Games tab: your total, this week’s points and your rank in the server (your global rank in a DM).',
              'The **Leaderboard** under the games shows the server’s top players (everyone’s in a DM), for this week or all time.',
            ]},
          ],
        },
      ],
    },

    'media-editor': {
      title: 'Media editor',
      summary: 'Edit pictures, GIFs, videos and sounds right in Discord, on your own or together in a room.',
      quick: [
        'Open it with `/editor`, with **Edit Media** or **Edit Avatar**, or from Launch.',
        'Pick **Just me** to edit alone, or **Everyone** or **Password** to start a room.',
        'Up to 10 people edit a room together and see each other’s cursors.',
        'A step someone is adjusting is theirs until they let go.',
        'Render full quality when you’re done, then post it in the channel.',
        'Save your effects as a template, or try one from the Template Hub.',
      ],
      sections: [
        {
          id: 'opening',
          title: 'Opening the editor',
          blocks: [
            {kind: 'list', items: [
              '`/editor` opens it in the channel. Attach a file or a link and it opens on that media. Without one, it opens on the editor’s rooms.',
              '**Edit Media** on a message (in its Apps menu) opens the editor on that message’s picture, GIF, video or sound. **Edit Avatar** on a person does the same with their avatar.',
              'Press **Launch** on NotSoBot in Discord’s app launcher, then pick **Edit media**.',
              '`/editor template:` with a template’s link or code opens with that template ready to go.',
            ]},
            {kind: 'text', text: 'NotSoBot usually posts a message in the channel too, with a **Join** button, so others can come edit with you.'},
            {kind: 'tip', text: 'The editor is on the web too, at [notsobot.com/editor](/editor). Templates work in both.'},
          ],
        },
        {
          id: 'start-screen',
          title: 'The start screen',
          blocks: [
            {kind: 'text', text: 'From Launch, the Activity first asks what you want to do: **Edit media** or **Games**. Each one shows how many people are editing or how many games are being played right now, and you can switch any time.'},
            {kind: 'text', text: 'To start an edit, pick a file (upload it, drop it in or paste a link), one of your recent edits, or start from **Or make one**: a blank canvas, a QR code or one of the bot’s text templates. Images, GIFs, videos and audio up to 10 minutes long all work.'},
          ],
        },
        {
          id: 'who',
          title: 'Just me, Everyone or Password',
          blocks: [
            {kind: 'text', text: 'Before you start, pick who the edit is for:'},
            {kind: 'facts', items: [
              {label: 'Just me', value: 'Your own edit. Nobody else in the Activity sees it.'},
              {label: 'Everyone', value: 'A new room anyone in the Activity can join, up to 10 people at a time.'},
              {label: 'Password', value: 'A new room only people with the password can join. It needs at least 4 characters.'},
            ]},
            {kind: 'text', text: 'A room can have a name, and can be watch-only. In a server, every channel’s Activity shares the same rooms. A room stays until it’s closed or goes a week without edits.'},
            {kind: 'tip', text: '**Fork** copies the media and its effects, as they are now, into a new room or your own edit. Nothing changes in the original.'},
          ],
        },
        {
          id: 'together',
          title: 'Editing together',
          blocks: [
            {kind: 'list', items: [
              'Up to 10 people can be in a room at once, watchers included.',
              'Everyone sees every change live, on the same preview.',
              '**Live cursors:** colored arrows with names show where others are pointing, on the preview, on effect tiles and on steps.',
              '**Step locks:** while someone adjusts a step, it’s theirs until they let go, and others see who’s adjusting it.',
              'A render pauses editing for everyone until it’s done.',
              'The header shows who’s in the room. Tap it for the full list.',
            ]},
            {kind: 'text', text: 'The room list lets you search rooms, people or effects, and filter by visibility, media type, rooms with space or your own.'},
          ],
        },
        {
          id: 'watch-only',
          title: 'Watch-only rooms',
          blocks: [
            {kind: 'text', text: 'In a watch-only room, only the creator changes things. Everyone else watches live, and can **Fork** their own copy to edit. Pick it when making a room, or turn it on or off in **Room settings**.'},
            {kind: 'text', text: 'Watchers can still render, copy the MediaScript and save a template.'},
          ],
        },
        {
          id: 'managing',
          title: 'Managing a room',
          blocks: [
            {kind: 'list', items: [
              'The creator can rename the room, change its password and turn watch-only on or off in **Room settings**. People already in stay in.',
              'The creator and the server’s moderators can remove people, and close or delete the room.',
              '**Close** sends everyone back to the room list and nobody can join again, but the creator keeps the edit. **Delete** removes the edit for everyone.',
              'Someone removed from a room can’t join it again.',
            ]},
          ],
        },
        {
          id: 'invites',
          title: 'Invites',
          blocks: [
            {kind: 'text', text: 'In a room, press **Invite**. **Share link** sends it through Discord, and **Post in this channel** posts it with a Join button. It opens the Activity straight into the room.'},
            {kind: 'list', items: [
              'It gets people into a password room without the password.',
              'People removed from the room stay out.',
              'It lasts 24 hours.',
            ]},
          ],
        },
        {
          id: 'templates',
          title: 'Templates',
          blocks: [
            {kind: 'list', items: [
              '**Save as template** saves your effects, never your media, as a link anyone can use on their own file. Add a password to keep it to people who know it.',
              '**Ask people for…** picks settings people fill in when they use it, like their own caption.',
              '**Templates** in the header loads one of yours onto the media you have open. Undo brings back what you had.',
              '**Share in chat** posts a card with the template’s effects, an example and a button to try it.',
              'The **Template Hub** has templates people published. Open **Browse templates** on the start screen, or [notsobot.com/editor/hub](/editor/hub). **Try it** starts an edit with one.',
              'To publish one of yours, press **Publish** in your template list. Its text, drawings and a sample render are checked first. Templates with a password can’t be published.',
            ]},
          ],
        },
        {
          id: 'posting',
          title: 'Rendering and posting',
          blocks: [
            {kind: 'steps', items: [
              'Press **Render full quality**. It runs on the original file. Pick a format, or leave it on Automatic.',
              'When it’s ready, **Share to channel** posts it with who made it, its effects and a button to edit it.',
              'Where NotSoBot can’t post (like a DM, or a channel you can’t send files in), Discord’s own share opens instead.',
            ]},
            {kind: 'tip', text: '**MediaScript** in the header copies your effects as a tag, or as lines for a script of your own.'},
          ],
        },
        {
          id: 'premium',
          title: 'What Premium changes',
          blocks: [
            {kind: 'text', text: 'Editing, rooms, invites and templates are free. [Premium](/premium) raises a few limits:'},
            {kind: 'facts', items: [
              {label: 'Render length', value: 'Up to 1,080 frames on Free, 2,160 with Premium.'},
              {label: 'Server Premium', value: 'Renders in a server’s rooms use the server’s Premium too.'},
              {label: 'Saved templates', value: '50 on Free, 200 with Premium.'},
              {label: 'On the hub', value: '10 published at once on Free, 50 with Premium.'},
            ]},
          ],
        },
      ],
    },
  },

  upcoming: {},
};
