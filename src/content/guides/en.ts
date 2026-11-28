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
// - Retro: notsogames.com-web `src/activity-games/retro/` (gameFile.ts `RETRO_SYSTEMS` is the one place the guide lists
//   the consoles, controls.ts the default keys, storage.ts what's kept where) and notsogames.retro's player (touch
//   controls, gamepads). rom-loader-plan.md's "The one rule": never name a commercial game, never suggest we provide
//   games, and keep "only play games you have the right to use"
// - Hold the Line: notsogames.com-web `src/activity-games/holdline/` (engine.ts hearts, hazards, bolts and stars,
//   levels.ts the 12 levels, progress.ts what opens a level, HoldTheLine.tsx the keys)
// - Loose Ends: notsogames.com-web `src/activity-games/looseends/` (board.ts threads, cuts, hints and stars,
//   generate.ts sizes, levels.ts and difficulty.ts the ramp: easy to hard up to LEVELS_TO_HARD, hard after, the Daily
//   medium-hard; progress.ts). The guide never says how many pairs a level has

import type { GuideBook } from './types';


export const GUIDES_ENGLISH: GuideBook = {
  opening: {
    id: 'opening',
    title: 'Opening the Activity',
    blocks: [
      {kind: 'text', text: 'NotSoBot’s Discord Activity has the media editor and the games. It opens right inside a channel, and everyone there can join.'},
      {kind: 'list', items: [
        'Use `/games play` to go straight to the games, or `/editor` for the media editor.',
        'Or press **Mess Around** on NotSoBot in Discord’s app launcher, then pick **Edit media** or **Games**.',
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
              'Use `/games play` in a channel, or press **Mess Around** on NotSoBot in Discord’s app launcher and pick **Games**.',
              'On the Games tab, pick **Flag Guesser**.',
              'Press **Play** or **Watch** on a room, use **Quick play**, make your own with **New room**, or press **Play solo** to play alone.',
              'Wait in the lobby for others, then the host presses **Start game**. A 3-second countdown (3, 2, 1) comes before the first flag, and nothing can be answered until it ends.',
            ]},
            {kind: 'text', text: 'Alone in your lobby? It offers **Invite friends**: share a link or post an invite in the channel. Or just start, a game works with one player.'},
            {kind: 'text', text: 'NotSoBot usually posts a message in the channel too, with a **Join** button, so others can jump in.'},
            {kind: 'tip', text: 'Playing `/games flag-guesser` in chat? Its **Open in Activity** button opens a room that carries on the same game: the flag that was up comes first, with the same difficulty, typed answers and a minute a flag. Scores start from zero. The round in chat ends there, and its message says who took the flag.'},
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
              {label: 'Difficulty', value: '**Easy** (the default): well-known flags that don’t look alike, with choices from anywhere. **Medium**: countries most people have heard of, with choices from the same region. **Hard**: small countries, territories and lookalike flags, with the lookalikes as choices. Each level has its own flags.'},
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
              'Use `/games play` in a channel, or press **Mess Around** on NotSoBot in Discord’s app launcher and pick **Games**.',
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

    'hold-the-line': {
      title: 'Hold the Line',
      summary: 'Draw lines to keep Pip the frog safe from bees, bombs, boulders, spikes and lava until the clock runs out.',
      quick: [
        'Draw lines on the board, then press **Go**. Pip has to last until the clock runs out.',
        'Lines use ink from the bar above the board. **Undo** takes the last line back, ink and all.',
        'After Go your lines fall. A line on a bolt swings from it, and one with a bolt at each end stays put.',
        'Pip has 3 hearts. A bee sting costs 1, and a bomb costs 2 unless something solid is in the way.',
        'Spikes, mines, lava, a rolling boulder or falling off the board end the try right away.',
        'Stars: one for lasting, one for losing no hearts, one for using half the ink or less.',
        'Get a star on a level to open the next one. There are 12.',
      ],
      sections: [
        {
          id: 'starting',
          title: 'Starting a level',
          blocks: [
            {kind: 'text', text: 'Hold the Line is a puzzle you play on your own. There are no rooms, and it doesn’t add to your [game points](guide:game-points).'},
            {kind: 'list', items: [
              '**On notsogames.com:** open **Hold the Line** on the home page, or go to `notsogames.com/hold-the-line`.',
              '**In the Activity:** use `/games play` (or press **Mess Around** on NotSoBot in Discord’s app launcher and pick **Games**), then pick **Hold the Line** on the Games tab.',
            ]},
            {kind: 'text', text: 'Pick a level. There are 12, each made by hand. A level opens once you have a star on the one before it. When a level brings in something new, a tip above the board says what it does.'},
          ],
        },
        {
          id: 'drawing',
          title: 'Drawing lines',
          blocks: [
            {kind: 'list', items: [
              'Press on the board and drag to draw a line, with a mouse, a finger or a pen. Let go to finish it.',
              'Draw as many lines as you like while the ink lasts. The bar above the board shows what’s left.',
              'A line can’t go through the ground, another line or Pip. It stops where something is in the way.',
              'You can draw over lava, but a line touching it burns away once you press Go.',
              '**Undo** takes back the last line and gives its ink back. **Restart** clears the board and starts the level over.',
            ]},
            {kind: 'tip', text: 'On a keyboard, **Space** or **Enter** is Go, **Z** is Undo and **R** is Restart.'},
          ],
        },
        {
          id: 'go',
          title: 'Pressing Go',
          blocks: [
            {kind: 'text', text: 'Nothing moves while you draw. **Go** starts the clock in the top right corner, and everything comes to life:'},
            {kind: 'list', items: [
              'Your lines turn solid and fall, unless a bolt holds them.',
              'Bees pour out of their hive and fly straight at Pip.',
              'Each bomb counts down the number on it, then blows up.',
              'Boulders roll, some drop in from the top after a moment, and crates and loose mines tumble.',
            ]},
            {kind: 'text', text: 'Pip makes it by still having a heart when the clock reaches zero. After Go your lines are set: to change them, press **Restart**, or **Try again** once the try is over.'},
          ],
        },
        {
          id: 'bolts',
          title: 'Bolts',
          blocks: [
            {kind: 'text', text: 'Some levels have bolts, small screws in the board.'},
            {kind: 'list', items: [
              'Start or end a line close to a bolt and it snaps onto it.',
              'A line on one bolt swings around it but doesn’t fall.',
              'A line with a bolt at each end is held at both, so it stays put: a bridge or a wall that doesn’t move.',
              'A bolt can hold more than one line.',
            ]},
          ],
        },
        {
          id: 'hearts',
          title: 'Hearts',
          blocks: [
            {kind: 'text', text: 'Pip starts every try with 3 hearts, in the top left corner. Lose them all and the try is over.'},
            {kind: 'facts', items: [
              {label: 'Bee sting', value: '1 heart. Pip flashes for a moment after a hit and can’t be stung again until it stops.'},
              {label: 'Bomb blast', value: '2 hearts, unless something solid is between the bomb and Pip, like a line. The dashed ring around a bomb shows how far it reaches.'},
              {label: 'A hard knock', value: '1 heart, when a crate, a bomb or one of your lines lands on Pip fast.'},
            ]},
            {kind: 'text', text: 'A blast also pushes everything near it away, Pip too, just less from behind a line.'},
          ],
        },
        {
          id: 'dangers',
          title: 'What ends a try',
          blocks: [
            {kind: 'text', text: 'These end the try straight away, however many hearts Pip has left:'},
            {kind: 'list', items: [
              'Touching spikes, or a spiked mine (they’re sharp on every side).',
              'Falling into lava.',
              'A rolling boulder. One that has stopped next to Pip is just a rock.',
              'Falling off the bottom of the board.',
            ]},
            {kind: 'tip', text: 'Lava can help too: bees that fly into it are gone, boulders, crates and mines sink, and a bomb that falls in goes off on the spot.'},
          ],
        },
        {
          id: 'stars',
          title: 'Stars',
          blocks: [
            {kind: 'facts', items: [
              {label: 'Lasted', value: 'Pip still has a heart when the clock runs out.'},
              {label: 'No hearts lost', value: 'Pip finishes with all 3 hearts.'},
              {label: 'Half the ink or less', value: 'Your lines used half the level’s ink or less.'},
            ]},
            {kind: 'text', text: 'Your best stars on each level are kept, and the level list shows your total. One star is enough to open the next level, so you can come back for the others later.'},
          ],
        },
        {
          id: 'progress',
          title: 'Where your progress is kept',
          blocks: [
            {kind: 'list', items: [
              '**Signed in:** your stars are kept on your account, so they follow you to other devices and between notsogames.com and the Activity. In the Activity you’re always signed in.',
              '**Not signed in:** they’re kept in this browser. Sign in on it later and they move onto your account.',
            ]},
          ],
        },
      ],
    },

    'loose-ends': {
      title: 'Loose Ends',
      summary: 'Join each pair of matching buttons with thread and cover every square. Endless boards, and a new Daily puzzle every day.',
      quick: [
        'Drag from a button to the other button of the same colour to stitch them together.',
        'Threads go up, down, left and right, one square at a time, and never cross.',
        'A puzzle is done when every pair is joined and every square has a thread through it.',
        'Drawing over a thread cuts it. Pull back before you let go and it comes back.',
        'Boards go from 5×5 to 9×9, each with endless levels that get harder as you go, plus an 8×8 Daily puzzle.',
        'Stars: one for solving, one for no hints, one for drawing each thread in one go.',
      ],
      sections: [
        {
          id: 'starting',
          title: 'Starting a puzzle',
          blocks: [
            {kind: 'text', text: 'Loose Ends is a puzzle you play on your own. There are no rooms, and it doesn’t add to your [game points](guide:game-points).'},
            {kind: 'list', items: [
              '**On notsogames.com:** open **Loose Ends** on the home page, or go to `notsogames.com/loose-ends`.',
              '**In the Activity:** use `/games play` (or press **Mess Around** on NotSoBot in Discord’s app launcher and pick **Games**), then pick **Loose Ends** on the Games tab.',
            ]},
            {kind: 'text', text: 'Then play the **Daily puzzle**, or pick a board size under **Boards** to play its next level.'},
          ],
        },
        {
          id: 'threads',
          title: 'Stitching threads',
          blocks: [
            {kind: 'list', items: [
              'Press on a button and drag to the other button of the same colour. The thread follows you square by square: up, down, left or right, never diagonally.',
              'A thread can’t go through a button of another colour, and it stops once it reaches its pair.',
              'Drag back along a thread to make it shorter.',
              'Press on a thread to carry on from that square. Drag from one of its buttons to draw it over from there, or just tap the button to clear it.',
            ]},
            {kind: 'text', text: 'The puzzle is solved when every pair is joined and every square has a thread through it. Most boards can be solved more than one way, and any of them counts. The text above the board shows how many pairs are joined and how much is covered.'},
            {kind: 'tip', text: 'A button doesn’t cover its own square until its thread leaves it.'},
          ],
        },
        {
          id: 'crossing',
          title: 'When threads meet',
          blocks: [
            {kind: 'text', text: 'Threads never cross. Drag one over another and the other is cut back to just before the spot you crossed.'},
            {kind: 'text', text: 'Changed your mind? Pull back before you let go and the cut thread comes back. Once you let go, the cut stays.'},
          ],
        },
        {
          id: 'stars',
          title: 'Stars',
          blocks: [
            {kind: 'facts', items: [
              {label: 'Solved', value: 'Every pair joined and every square covered.'},
              {label: 'No hints', value: 'Solved without pressing **Hint**.'},
              {label: 'Each thread in one go', value: 'Draw a thread, then move on to the next. Fixing the one you just drew is fine, but going back to one you already left costs this star.'},
            ]},
            {kind: 'text', text: '**Restart** clears the board and gives you a fresh go at all three. Your best stars on each level are kept.'},
          ],
        },
        {
          id: 'hints',
          title: 'Hints',
          blocks: [
            {kind: 'text', text: '**Hint** lays down one thread from the puzzle’s own answer, for the first pair that isn’t joined yet. Threads in its way are cut back, and since most boards have more than one answer, it may not match the one you’re building. Use as many as you need: any hint costs the no hints star for that try.'},
          ],
        },
        {
          id: 'boards',
          title: 'Boards and levels',
          blocks: [
            {kind: 'list', items: [
              'There are five board sizes, from 5×5 to 9×9.',
              'Each size has its own levels, and they never run out. Its button opens the level after the highest one you’ve solved.',
              'Every size starts easy, with lots of short threads, and gets harder up to about level 40. Harder boards have fewer, longer threads and fewer moves you’re forced into.',
              'After level 40, every level stays hard, each in its own way.',
              'There’s no time limit and no limit on moves, restarts or hints. A hint only costs the No hints star.',
              'Every level is the same puzzle for everyone who plays it.',
              'When you solve one, **Next level** takes you straight to the next.',
            ]},
          ],
        },
        {
          id: 'daily',
          title: 'The Daily puzzle',
          blocks: [
            {kind: 'list', items: [
              'Every day there’s one 8×8 puzzle, medium-hard and the same for everyone.',
              'A new one comes at midnight UTC.',
              'Once you solve it, your stars show beside it, and **Play again** lets you go for more.',
            ]},
          ],
        },
        {
          id: 'progress',
          title: 'Where your progress is kept',
          blocks: [
            {kind: 'list', items: [
              '**Signed in:** your levels, stars and Dailies are kept on your account, so they follow you to other devices and between notsogames.com and the Activity. In the Activity you’re always signed in.',
              '**Not signed in:** they’re kept in this browser. Sign in on it later and they move onto your account.',
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
              {label: '`/games points`', value: 'Someone’s total, their points per game, this week’s points, their rank in the server and worldwide, and their record in each room game (wins, losses, ties, games left, win streak and best stats). Leave out the user to see your own.'},
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

    'retro': {
      title: 'Retro',
      summary: 'Play classic console games from your own files, on your own, on notsogames.com or in the Activity.',
      quick: [
        'Choose or drop a game file of your own, or a .zip with one inside, and it starts.',
        'Games you load stay in **Your games** on this device for next time.',
        'Arrow keys move, X is A, Z is B and Enter is Start. Esc opens the menu.',
        'Gamepads work too, and touch screens get buttons on screen.',
        'The menu has 4 save state slots, your controls and the sound.',
        'Your games and saves never leave your device. Nothing is uploaded.',
        'Only play games you have the right to use.',
      ],
      sections: [
        {
          id: 'starting',
          title: 'Opening Retro',
          blocks: [
            {kind: 'text', text: 'Retro plays games from files you already have, right in your browser. It’s just you and the game: there are no rooms, and it doesn’t add to your game points.'},
            {kind: 'list', items: [
              '**On notsogames.com:** open **Retro** on the home page, or go to `notsogames.com/retro`.',
              '**In the Activity:** use `/games play` (or press **Mess Around** on NotSoBot in Discord’s app launcher and pick **Games**), then pick **Retro** on the Games tab.',
            ]},
            {kind: 'tip', text: 'Retro doesn’t come with any games, you bring your own. Only play games you have the right to use.'},
          ],
        },
        {
          id: 'loading',
          title: 'Loading a game',
          blocks: [
            {kind: 'steps', items: [
              'Press **Choose a game file**, or drop a file on the box under it.',
              'The game starts right away, and is added to **Your games**.',
            ]},
            {kind: 'text', text: 'Retro plays NES, SNES, Game Boy, Game Boy Color and Game Boy Advance games.'},
            {kind: 'list', items: [
              'It reads the file itself to tell which console it’s for, so the name doesn’t matter.',
              'A .zip works too: Retro opens it and plays the first game it finds inside.',
              'A file that isn’t a game Retro plays is turned away, with a line saying why.',
            ]},
          ],
        },
        {
          id: 'your-games',
          title: 'Your games',
          blocks: [
            {kind: 'list', items: [
              'Every game you load shows in **Your games**, with its console and size. Press one to play it again.',
              'It keeps the file’s own name. The same file loaded twice is one game, whatever it’s called.',
              '**Remove** (the bin beside a game) deletes it and all its saves from this device.',
            ]},
          ],
        },
        {
          id: 'controls',
          title: 'Controls',
          blocks: [
            {kind: 'text', text: 'With a keyboard, these are the keys to start with:'},
            {kind: 'facts', items: [
              {label: 'Move', value: 'Arrow keys'},
              {label: 'A and B', value: '**X** and **Z**'},
              {label: 'Start', value: '**Enter**'},
              {label: 'Select', value: '**Right Shift** or **Backspace**'},
              {label: 'Menu', value: '**Esc**'},
            ]},
            {kind: 'text', text: 'Consoles with more buttons, like L and R or X and Y, have keys for those too. The menu’s **Controls** lists every button the game’s console has, with its keys.'},
            {kind: 'text', text: 'To change a key, open the menu, press **Change** beside a button, then press the new key. If another button had that key, it moves over. **Default keys** puts them all back. Esc can’t be changed: it always opens the menu. Your keys are kept on this device, for every game.'},
            {kind: 'text', text: '**Gamepads** work too: connect one and press a button. Retro goes by where the buttons sit, so the bottom face button is B and the right one is A, with X and Y on the top and left ones for consoles that have them. The d-pad or left stick moves, the shoulder buttons are L and R, Start or Menu is Start, and Back or View is Select. Only keyboard keys can be changed.'},
          ],
        },
        {
          id: 'touch',
          title: 'Touch controls',
          blocks: [
            {kind: 'text', text: 'On a touch screen, a d-pad and buttons show under the game.'},
            {kind: 'list', items: [
              'Press between two arrows on the d-pad to go diagonally.',
              'Slide from one button to another without lifting your finger.',
              'Extra buttons, like L and R, only show when the game’s console has them.',
              'Hold your phone sideways and the controls move to the sides of the screen.',
            ]},
            {kind: 'text', text: 'In the menu, **Touch controls** is **Auto** (only on touch screens, the default), **On** or **Off**.'},
          ],
        },
        {
          id: 'menu',
          title: 'The pause menu',
          blocks: [
            {kind: 'text', text: 'Press **Esc**, or the menu button at the top right, to pause. The game waits until you press **Resume**.'},
            {kind: 'list', items: [
              '**Save states:** save and load your 4 slots.',
              '**Controls:** your keys, gamepad buttons and touch controls.',
              '**Game saves:** export and import the game’s own save, on notsogames.com.',
              '**Sound:** **Mute** and **Volume**, kept on this device.',
              '**Restart game:** starts over. Anything since the game last saved is lost, your save states stay.',
            ]},
            {kind: 'tip', text: 'The X at the top left closes the game and takes you back to Your games. The game’s own save is kept first.'},
          ],
        },
        {
          id: 'saves',
          title: 'Save states and game saves',
          blocks: [
            {kind: 'text', text: 'Retro keeps two kinds of saves, both on this device:'},
            {kind: 'facts', items: [
              {label: 'Save states', value: 'A snapshot of the game as it is right now, made from the menu. Each game has 4 slots, each with a picture of the screen and when it was saved. **Save** fills a slot (replacing what was in it), **Load** takes you back to it.'},
              {label: 'Game saves', value: 'The saves the game makes itself, for games that can save. Retro keeps them on its own whenever the game saves, and they’re there the next time you start the game.'},
            ]},
            {kind: 'text', text: 'On notsogames.com, **Export save** downloads the game’s own save as a .sav file, and **Import save** loads one: the game restarts with it, and it replaces the one kept here. The Activity has no export or import.'},
          ],
        },
        {
          id: 'storage',
          title: 'Where it’s kept',
          blocks: [
            {kind: 'text', text: 'Your games, saves, save states and settings are kept in this browser on this device. They’re never uploaded, so nobody sees them, us included.'},
            {kind: 'list', items: [
              'notsogames.com and the Activity each keep their own. A game loaded in one isn’t in the other.',
              'Saves made in the Activity stay in Discord on that device. They can’t be moved to notsogames.com yet.',
              'Another device or browser starts empty.',
              'A private window forgets everything once it’s closed, and clearing the site’s data deletes it all. Retro says so when this browser isn’t keeping anything.',
            ]},
            {kind: 'tip', text: 'Want a copy of your progress? On notsogames.com, export the game’s save and keep the file.'},
          ],
        },
        {
          id: 'sound',
          title: 'Sound',
          blocks: [
            {kind: 'text', text: 'Some phones and browsers only play sound after you touch the page. If a game starts quiet, tap it once.'},
            {kind: 'text', text: '**Mute** and **Volume** are in the menu, under **Sound**.'},
          ],
        },
        {
          id: 'source',
          title: 'Emulators and source',
          blocks: [
            {kind: 'text', text: 'Retro runs open-source emulators in your browser. **Emulators and source**, at the bottom of Retro, lists them with their licences.'},
            {kind: 'text', text: 'The player’s source, with every change we made to the emulators, is on [GitHub](https://github.com/NotSoBot/notsogames.retro).'},
          ],
        },
      ],
    },

    'media-editor': {
      title: 'Media editor',
      summary: 'Edit pictures, GIFs, videos and sounds right in Discord, on your own or together in a room.',
      quick: [
        'Open it with `/editor`, with **Edit Media** or **Edit Avatar**, or from Mess Around in Discord’s app launcher.',
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
              'Press **Mess Around** on NotSoBot in Discord’s app launcher, then pick **Edit media**.',
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
            {kind: 'text', text: 'From Mess Around, the Activity first asks what you want to do: **Edit media** or **Games**. Each one shows how many people are editing or how many games are being played right now, and you can switch any time. If people are in an editor lobby or a game room, **Jump in with someone** lists them with a **Join** button that takes you straight to their room. If you pressed **Join** on someone\'s Mess Around message, that person is listed first.'},
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
