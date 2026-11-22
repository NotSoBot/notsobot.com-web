import type { TagDocCategoryId } from './types';


export const TAG_DOC_CATEGORIES: ReadonlyArray<{id: TagDocCategoryId, title: string, description: string}> = [
  {id: 'arguments', title: 'Arguments', description: 'Read what was passed to the tag.'},
  {id: 'user', title: 'Users', description: 'The person running the tag, or anyone else.'},
  {id: 'server', title: 'Servers & Channels', description: 'Information about where the tag is running.'},
  {id: 'message', title: 'Messages', description: 'The invoking message and the one it replies to.'},
  {id: 'variables', title: 'Variables & Storage', description: 'Remember values for this run, or keep them between runs.'},
  {id: 'logic', title: 'Logic & Control Flow', description: 'Conditions, loops, and stopping early.'},
  {id: 'math', title: 'Math', description: 'Arithmetic and number helpers.'},
  {id: 'strings', title: 'Text', description: 'Change, search, and measure text.'},
  {id: 'markup', title: 'Discord Markdown', description: 'Wrap text in Discord formatting.'},
  {id: 'rng', title: 'Randomness', description: 'Random picks, numbers, and IDs.'},
  {id: 'media', title: 'Media', description: 'Find, attach, and edit images, audio, and video.'},
  {id: 'ai', title: 'AI', description: 'Generate text and images, and read what is in them.'},
  {id: 'search', title: 'Search', description: 'Search the web from a tag.'},
  {id: 'network', title: 'Network', description: 'Fetch pages and call APIs.'},
  {id: 'output', title: 'Output', description: 'Embeds, buttons, pages, and files attached to the reply.'},
  {id: 'json', title: 'JSON', description: 'Discord objects as JSON, and reading JSON.'},
  {id: 'tags', title: 'Tags', description: 'Run other tags and read tag info.'},
  {id: 'time', title: 'Time', description: 'Timestamps and dates.'},
  {id: 'meta', title: 'Miscellaneous', description: 'Everything else.'},
];
